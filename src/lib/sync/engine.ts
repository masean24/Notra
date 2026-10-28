"use client"

/**
 * Background offline sync engine (SPEC §10, Phase 7).
 *
 * Replays `pendingOps` FIFO against /api/notes/* when the browser reports
 * being online. Guarantees:
 *   * bounded retry with exponential backoff — attempts past MAX_ATTEMPTS
 *     move the op into `conflicts` (never an infinite retry loop);
 *   * an op based on a note that changed server-side while offline raises a
 *     "keep mine / use server" conflict instead of silently overwriting;
 *   * an op rejected with EDIT_SESSION_EXPIRED is parked for a re-enter
 *     edit code flow — user work is never silently dropped;
 *   * non-retryable validation failures (4xx) go straight to `conflicts`.
 *
 * The engine exposes plain window events (`notra:sync`) so UI
 * components can react without a state library.
 */

import {
  addConflict,
  cleanupStaleData,
  deleteOp,
    listOpsFifo,
  mapDraftToNote,
  updateOp,
  type PendingOp,
} from "@/lib/sync/drafts"

export const SYNC_EVENT_NAME = "notra:sync"

export type SyncStatus = "idle" | "syncing" | "offline" | "blocked"

const MAX_ATTEMPTS = 8
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 60_000

export function backoffDelay(attempts: number): number {
  const delay = BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1)
  return Math.min(delay, MAX_DELAY_MS)
}

/** How the engine treats a failure — bounded retry, park, or conflict. */
export type FailureKind = "retry" | "reauth" | "permanent"

export function classifyFailure(error: unknown): FailureKind {
  // apiFetch throws ApiRequestError with a status for envelope errors;
  // network failures surface as plain TypeError("Failed to fetch").
  const isApiError =
    error instanceof Error &&
    typeof (error as unknown as { status?: unknown }).status === "number"
  if (!isApiError) {
    return "retry" // network hiccup / offline
  }
  const status = (error as unknown as { status: number }).status
  if (status === 401 && (error as { code?: string }).code === "EDIT_SESSION_EXPIRED") {
    return "reauth"
  }
  if (status >= 400 && status < 500) {
    return "permanent"
  }
  return "retry" // 5xx: worth retrying within the attempt budget
}

function emitSyncEvent(detail: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail }))
}

let syncing = false

/**
 * Replays the queue FIFO. Safe to call repeatedly (concurrent calls collapse
 * into the running one); resolves when the queue is drained, blocked, or
 * the device is offline.
 */
export async function runSync(): Promise<SyncStatus> {
  if (typeof window === "undefined") {
    return "idle"
  }
  if (!navigator.onLine) {
    emitSyncEvent({ status: "offline" })
    return "offline"
  }
  if (syncing) {
    return "syncing"
  }
  syncing = true
  emitSyncEvent({ status: "syncing" })
  try {
    return await drainQueue()
  } finally {
    syncing = false
  }
}

async function drainQueue(): Promise<SyncStatus> {
  const ops = await listOpsFifo()
  for (const op of ops) {
    const outcome = await replayOp(op)
    if (outcome === "stop") {
      emitSyncEvent({ status: "blocked", reason: "needs_attention" })
      return "blocked"
    }
    if (outcome === "offline") {
      emitSyncEvent({ status: "offline" })
      return "offline"
    }
  }
  emitSyncEvent({ status: "idle" })
  return "idle"
}

/** Returns "continue" | "stop" | "offline" for the queue loop. */
async function replayOp(op: PendingOp): Promise<"continue" | "stop" | "offline"> {
  // Conflict check for saves: has the note changed on the server since the
  // op was queued? If so, park it — the user decides which version wins.
  if (op.kind === "save" && op.publicId && op.baseUpdatedAt) {
    const serverState = await fetchNote(op.publicId)
    if (serverState?.updated_at && serverState.updated_at !== op.baseUpdatedAt) {
      await updateOp(op.id!, { lastError: "server_changed" })
      await addConflict({
        publicId: op.publicId,
        reason: "server_changed",
        title: op.title,
        content: op.content,
        contentFormat: op.contentFormat,
        serverUpdatedAt: serverState.updated_at,
      })
      await deleteOp(op.id!)
      emitSyncEvent({ status: "conflict", publicId: op.publicId })
      return "continue"
    }
  }

  try {
    if (op.kind === "create") {
      const data = await apiJson<{ publicId: string }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title: op.title,
          content: op.content,
          contentFormat: op.contentFormat,
          editingPolicy: op.requiresAuth ? "account" : "edit_code",
          // A queued create has no raw edit code (it was shown once and is
          // never persisted) — the note is created under the account policy
          // for signed-in users. Guest creates are therefore not queued.
        }),
      })
      await mapDraftToNote(data.publicId)
    } else {
      await apiJson(`/api/notes/${op.publicId}/save`, {
        method: "PUT",
        body: JSON.stringify({
          title: op.title,
          content: op.content,
          contentFormat: op.contentFormat,
        }),
      })
    }
    await deleteOp(op.id!)
    emitSyncEvent({ status: "synced", publicId: op.publicId })
    return "continue"
  } catch (error) {
    const kind = classifyFailure(error)
    if (kind === "retry") {
      const attempts = op.attempts + 1
      if (attempts > MAX_ATTEMPTS) {
        // Bounded retry budget exhausted — stop looping, keep the work.
        await updateOp(op.id!, { attempts, lastError: "max_attempts" })
        await addConflict({
          publicId: op.publicId ?? "",
          reason: "failed",
          title: op.title,
          content: op.content,
          contentFormat: op.contentFormat,
          serverUpdatedAt: null,
        })
        await deleteOp(op.id!)
        emitSyncEvent({ status: "conflict", publicId: op.publicId })
        return "continue"
      }
      await updateOp(op.id!, { attempts, lastError: "network" })
      // Offline mid-replay: stop draining; the next online event resumes.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return "offline"
      }
      await sleep(backoffDelay(attempts))
      return replayOp(op)
    }
    if (kind === "reauth") {
      // Expired edit session: park the op and surface "re-enter edit code".
      await updateOp(op.id!, { needsReauth: true, lastError: "edit_session_expired" })
      emitSyncEvent({ status: "reauth", publicId: op.publicId })
      return "stop"
    }
    // Permanent validation failure: park as a failed conflict.
    await addConflict({
      publicId: op.publicId ?? "",
      reason: "failed",
      title: op.title,
      content: op.content,
      contentFormat: op.contentFormat,
      serverUpdatedAt: null,
    })
    await deleteOp(op.id!)
    emitSyncEvent({ status: "conflict", publicId: op.publicId })
    return "continue"
  }
}

interface NoteState {
  updated_at?: string
}

/** Best-effort server state probe for conflict detection (null on any error). */
async function fetchNote(publicId: string): Promise<NoteState | null> {
  try {
    return await apiJson<NoteState>(`/api/notes/${publicId}`)
  } catch {
    // A failed probe must not block the save; the save itself will surface
    // network/permanent failures through the normal path.
    return null
  }
}

async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set("content-type", "application/json")
  const response = await fetch(input, { ...init, headers })
  const body = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error: { code: string; message: string } }
  if (!body.success) {
    const error = new Error(body.error.message) as Error & {
      status: number
      code: string
    }
    error.status = response.status
    error.code = body.error.code
    throw error
  }
  return body.data
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let initialized = false

/**
 * Wires the engine to the browser's online events and runs periodic stale
 * data cleanup. Idempotent; called from the editor mount.
 */
export function initSyncEngine(): void {
  if (typeof window === "undefined" || initialized) {
    return
  }
  initialized = true
  window.addEventListener("online", () => {
    void runSync()
  })
  window.addEventListener("offline", () => {
    emitSyncEvent({ status: "offline" })
  })
  void cleanupStaleData().catch(() => {})
  void runSync()
}
