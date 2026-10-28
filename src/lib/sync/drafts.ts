import Dexie, { type EntityTable } from "dexie"

/**
 * Local sync layer (SPEC §10, Phase 7).
 *
 * Four Dexie tables over IndexedDB — never localStorage:
 *   * drafts     — the working /new draft (survives refresh/offline)
 *   * pendingOps — saves queued while offline, replayed FIFO
 *   * idMap      — maps the local "current" draft to its server note
 *   * conflicts  — ops that hit a server-side change or an expired session
 *
 * The background engine lives in lib/sync/engine.ts.
 */

export interface StoredDraft {
  /** Singleton key for the /new editor draft: "current". */
  key: string
  content: unknown
  updatedAt: number
}

export type PendingOpKind = "create" | "save"

export interface PendingOp {
  id?: number
  kind: PendingOpKind
  /** Server note this op targets (absent for "create"). */
  publicId?: string
  title: string
  content: unknown
  contentFormat: string
  /** Server updated_at when this op was queued — conflict detection. */
  baseUpdatedAt: string | null
  /** Guest drafts (account policy) require sign-in to sync. */
  requiresAuth: boolean
  createdAt: number
  attempts: number
  lastError: string | null
  /** Set when replay failed with EDIT_SESSION_EXPIRED: user must re-verify. */
  needsReauth: boolean
}

export interface IdMapRow {
  /** Always "current" — the single local draft. */
  key: string
  publicId: string
  createdAt: number
}

export type ConflictReason = "server_changed" | "expired_session" | "failed"

export interface ConflictRow {
  id?: number
  publicId: string
  reason: ConflictReason
  title: string
  content: unknown
  contentFormat: string
  /** Server updated_at observed when the conflict was detected. */
  serverUpdatedAt: string | null
  createdAt: number
}

const DRAFT_KEY = "current"
export const ID_MAP_KEY = "current"

const db = new Dexie("notra") as Dexie & {
  drafts: EntityTable<StoredDraft, "key">
  pendingOps: EntityTable<PendingOp, "id">
  idMap: EntityTable<IdMapRow, "key">
  conflicts: EntityTable<ConflictRow, "id">
}

db.version(1).stores({
  drafts: "key, updatedAt",
})

// Version 2 (Phase 7): full sync tables. Schema of drafts unchanged.
db.version(2).stores({
  drafts: "key, updatedAt",
  pendingOps: "++id, publicId, createdAt",
  idMap: "key",
  conflicts: "++id, publicId, createdAt",
})

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export async function saveDraft(content: unknown): Promise<void> {
  await db.drafts.put({
    key: DRAFT_KEY,
    content,
    updatedAt: Date.now(),
  })
}

export async function loadDraft(): Promise<StoredDraft | undefined> {
  return db.drafts.get(DRAFT_KEY)
}

export async function clearDraft(): Promise<void> {
  await db.drafts.delete(DRAFT_KEY)
}

/** Generic key/value settings persisted in IndexedDB (never localStorage). */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.drafts.get(key)
  return row?.content as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.drafts.put({ key, content: value, updatedAt: Date.now() })
}

// ---------------------------------------------------------------------------
// Pending ops (offline queue)
// ---------------------------------------------------------------------------

export async function enqueueOp(
  op: Omit<PendingOp, "id" | "attempts" | "lastError" | "needsReauth">
): Promise<void> {
  await db.pendingOps.add({
    ...op,
    attempts: 0,
    lastError: null,
    needsReauth: false,
  } as PendingOp)
}

export async function listOpsFifo(): Promise<PendingOp[]> {
  return db.pendingOps.orderBy("id").toArray()
}

export async function updateOp(id: number, changes: Partial<PendingOp>): Promise<void> {
  await db.pendingOps.update(id, changes)
}

export async function deleteOp(id: number): Promise<void> {
  await db.pendingOps.delete(id)
}

export async function getOpForNote(publicId: string): Promise<PendingOp | undefined> {
  return db.pendingOps.where("publicId").equals(publicId).first()
}

// ---------------------------------------------------------------------------
// Id map
// ---------------------------------------------------------------------------

export async function mapDraftToNote(publicId: string): Promise<void> {
  await db.idMap.put({ key: ID_MAP_KEY, publicId, createdAt: Date.now() })
}

export async function getMappedNoteId(): Promise<string | undefined> {
  const row = await db.idMap.get(ID_MAP_KEY)
  return row?.publicId
}

export async function clearIdMap(): Promise<void> {
  await db.idMap.delete(ID_MAP_KEY)
}

// ---------------------------------------------------------------------------
// Conflicts
// ---------------------------------------------------------------------------

export async function addConflict(
  conflict: Omit<ConflictRow, "id" | "createdAt">
): Promise<void> {
  await db.conflicts.add({ ...conflict, createdAt: Date.now() })
}

export async function listConflicts(): Promise<ConflictRow[]> {
  return db.conflicts.orderBy("createdAt").toArray()
}

export async function deleteConflict(id: number): Promise<void> {
  await db.conflicts.delete(id)
}

// ---------------------------------------------------------------------------
// Periodic cleanup (SPEC §10): stale local data must not grow unbounded.
// Resolved conflicts and old failed ops are pruned past a reasonable age.
// ---------------------------------------------------------------------------

const STALE_AGE_MS = 7 * 24 * 60 * 60 * 1000
/** Unsynced ops older than this are beyond recovery — moved out of the way. */
const DEAD_OP_AGE_MS = 30 * 24 * 60 * 60 * 1000

export async function cleanupStaleData(now = Date.now()): Promise<{
  conflictsDeleted: number
  opsDeleted: number
}> {
  const staleConflicts = await db.conflicts
    .filter((row) => now - row.createdAt > STALE_AGE_MS)
    .primaryKeys()
  await db.conflicts.bulkDelete(staleConflicts)

  const deadOps = await db.pendingOps
    .filter((row) => now - row.createdAt > DEAD_OP_AGE_MS)
    .primaryKeys()
  await db.pendingOps.bulkDelete(deadOps)

  return {
    conflictsDeleted: staleConflicts.length,
    opsDeleted: deadOps.length,
  }
}
