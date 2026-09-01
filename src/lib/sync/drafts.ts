import Dexie, { type EntityTable } from "dexie"

/**
 * Local draft persistence (Phase 2 minimal Dexie layer).
 *
 * The working draft of /new is stored in IndexedDB — never localStorage —
 * so it survives refresh, browser restarts, and temporary offline periods.
 * The full sync engine (pendingOps, idMap, conflicts) arrives in Phase 7.
 */
export interface StoredDraft {
  /** Singleton key for the /new editor draft: "current". */
  key: string
  content: unknown
  updatedAt: number
}

const DRAFT_KEY = "current"

const db = new Dexie("opennotepad") as Dexie & {
  drafts: EntityTable<StoredDraft, "key">
}

db.version(1).stores({
  drafts: "key, updatedAt",
})

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
