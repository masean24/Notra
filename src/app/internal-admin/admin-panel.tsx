"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, ShieldAlert, ShieldCheck, Trash2, Undo2, Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiRequestError, apiFetch } from "@/lib/client/api"

/** Shapes returned by /api/admin (payloads of the admin_* RPCs). */
interface AdminStats {
  users: number
  notes: number
  owned_notes: number
  deleted_notes: number
  revisions: number
  active_sessions: number
  audit_entries: number
}

interface AdminUserRow {
  id: string
  email: string | null
  is_admin: boolean
  created_at: string
  note_count: number
}

interface AdminNoteRow {
  public_id: string
  title: string | null
  visibility: string
  deleted_at: string | null
  owner_email: string | null
  created_at: string
}

interface AuditRow {
  id: string
  action: string
  target_id: string | null
  created_at: string
}

interface ProbeRow {
  id: string
  ip_hash: string
  path: string
  created_at: string
}

const TABS = ["stats", "users", "notes", "audit", "probes"] as const
type Tab = (typeof TABS)[number]

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

/**
 * Admin panel client (SPEC §14/§27 Phase 9): stats, user list, note
 * moderation (soft-delete/restore), lockout override, audit + probe logs.
 * Every call is re-authorized server-side; a non-admin simply gets 404s.
 */
export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("stats")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [notes, setNotes] = useState<AdminNoteRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [probes, setProbes] = useState<ProbeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busyNote, setBusyNote] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState("50")
  const limit = Math.min(Math.max(Number(limitInput) || 50, 1), 200)

  const load = useCallback(async (which: Tab) => {
    setLoading(true)
    try {
      switch (which) {
        case "stats": {
          const data = await apiFetch<AdminStats>("/api/admin?resource=stats")
          setStats(data)
          break
        }
        case "users": {
          const data = await apiFetch<AdminUserRow[]>(
            `/api/admin?resource=users&limit=${limit}`
          )
          setUsers(data)
          break
        }
        case "notes": {
          const data = await apiFetch<AdminNoteRow[]>(
            `/api/admin?resource=notes&limit=${limit}`
          )
          setNotes(data)
          break
        }
        case "audit": {
          const data = await apiFetch<AuditRow[]>(
            `/api/admin?resource=audit&limit=${limit}`
          )
          setAudit(data)
          break
        }
        case "probes": {
          const data = await apiFetch<ProbeRow[]>(
            `/api/admin?resource=probes&limit=${limit}`
          )
          setProbes(data)
          break
        }
      }
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError
          ? error.message
          : "Could not load admin data."
      )
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    const run = async () => {
      await Promise.resolve()
      await load(tab)
    }
    void run()
  }, [tab, load])

  async function moderate(note: AdminNoteRow, deleted: boolean) {
    setBusyNote(note.public_id)
    try {
      await apiFetch("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: "set_note_deleted",
          publicId: note.public_id,
          deleted,
        }),
      })
      toast.success(deleted ? "Note soft-deleted." : "Note restored.")
      await load("notes")
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "Action failed."
      )
    } finally {
      setBusyNote(null)
    }
  }

  async function clearLockout(note: AdminNoteRow) {
    setBusyNote(note.public_id)
    try {
      await apiFetch("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action: "clear_lockout", publicId: note.public_id }),
      })
      toast.success("Lockout cleared for that note.")
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "Action failed."
      )
    } finally {
      setBusyNote(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="size-5" aria-hidden />
          Internal admin
        </h1>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="admin-limit" className="text-xs">
              Rows
            </Label>
            <Input
              id="admin-limit"
              type="number"
              min={1}
              max={200}
              value={limitInput}
              onChange={(event) => setLimitInput(event.target.value)}
              className="h-8 w-20 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => void load(tab)} disabled={loading}>
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        </div>
      </header>

      <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Button
            key={entry}
            variant={tab === entry ? "default" : "outline"}
            size="sm"
            aria-pressed={tab === entry}
            onClick={() => setTab(entry)}
          >
            {entry === "stats" ? (
              <ShieldAlert className="size-4" aria-hidden />
            ) : entry === "users" ? (
              <Users className="size-4" aria-hidden />
            ) : null}
            {entry[0]!.toUpperCase() + entry.slice(1)}
          </Button>
        ))}
      </nav>

      {tab === "stats" ? (
        <section aria-label="Platform statistics">
          {stats ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["Users", stats.users],
                  ["Notes", stats.notes],
                  ["Owned notes", stats.owned_notes],
                  ["Soft-deleted", stats.deleted_notes],
                  ["Revisions", stats.revisions],
                  ["Active sessions", stats.active_sessions],
                  ["Audit entries", stats.audit_entries],
                ] as Array<[string, number]>
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-card p-4">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-2xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : "No stats loaded."}
            </p>
          )}
        </section>
      ) : null}

      {tab === "users" ? (
        <section aria-label="User list" className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">Registered users</caption>
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2">Email</th>
                <th scope="col" className="px-3 py-2">Admin</th>
                <th scope="col" className="px-3 py-2">Notes</th>
                <th scope="col" className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-3 py-2">{user.email ?? "(no email)"}</td>
                  <td className="px-3 py-2">{user.is_admin ? "yes" : "no"}</td>
                  <td className="px-3 py-2">{user.note_count}</td>
                  <td className="px-3 py-2">{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "notes" ? (
        <section aria-label="Note moderation" className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">Recent notes with moderation actions</caption>
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2">Title</th>
                <th scope="col" className="px-3 py-2">Owner</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.public_id} className="border-t">
                  <td className="px-3 py-2">{note.title || "(untitled)"}</td>
                  <td className="px-3 py-2">{note.owner_email ?? "guest"}</td>
                  <td className="px-3 py-2">
                    {note.deleted_at ? "deleted" : note.visibility}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={busyNote === note.public_id}
                        onClick={() => void moderate(note, !note.deleted_at)}
                      >
                        {note.deleted_at ? (
                          <>
                            <Undo2 className="size-3.5" aria-hidden />
                            Restore
                          </>
                        ) : (
                          <>
                            <Trash2 className="size-3.5" aria-hidden />
                            Soft-delete
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busyNote === note.public_id}
                        onClick={() => void clearLockout(note)}
                      >
                        Clear lockout
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "audit" ? (
        <section aria-label="Admin audit log" className="rounded-xl border">
          <ol className="divide-y">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-mono">{entry.action}</span>
                <span className="text-muted-foreground">{entry.target_id}</span>
                <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
              </li>
            ))}
            {audit.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No entries.</li>
            ) : null}
          </ol>
        </section>
      ) : null}

      {tab === "probes" ? (
        <section aria-label="Decoy probe log" className="rounded-xl border">
          <ol className="divide-y">
            {probes.map((probe) => (
              <li key={probe.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-mono">{probe.path}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {probe.ip_hash.slice(0, 12)}…
                </span>
                <time dateTime={probe.created_at}>{formatDate(probe.created_at)}</time>
              </li>
            ))}
            {probes.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No probes recorded.</li>
            ) : null}
          </ol>
        </section>
      ) : null}
    </div>
  )
}
