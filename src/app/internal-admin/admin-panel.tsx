"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowLeft,
  FileText,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Undo2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { NotraMark } from "@/components/brand/notra-logo"
import { ThemeToggle } from "@/components/theme-toggle"
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
    <div className="min-h-svh flex flex-col bg-background text-foreground">
      {/* Top Operator Bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl px-4 sm:px-8 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2.5 group">
              <NotraMark className="size-6 transition-transform group-hover:scale-105" />
              <span className="text-sm font-semibold tracking-tight">Notra</span>
            </Link>
            <span className="text-border">/</span>
            <h1 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-brand-ink" aria-hidden />
              <span>Internal admin</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] text-brand-ink">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              <span>OPERATOR VERIFIED</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="admin-limit" className="text-xs text-muted-foreground font-mono">
                Rows
              </Label>
              <Input
                id="admin-limit"
                type="number"
                min={1}
                max={200}
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
                className="h-8 w-20 text-xs font-mono"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(tab)}
              disabled={loading}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
              <span>Refresh</span>
            </Button>
            <ThemeToggle className="size-8 rounded-lg border border-border/80" />
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/dashboard" />}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Workspace</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 py-8 space-y-6">
        {/* Segmented Navigation */}
        <nav
          aria-label="Admin sections"
          className="inline-flex flex-wrap gap-1.5 rounded-xl border border-border/80 bg-card p-1.5 shadow-2xs"
        >
          {TABS.map((entry) => (
            <Button
              key={entry}
              variant={tab === entry ? "default" : "ghost"}
              size="sm"
              aria-pressed={tab === entry}
              onClick={() => setTab(entry)}
              className="h-8 gap-1.5 rounded-lg px-3.5 text-xs font-medium"
            >
              {entry === "stats" ? (
                <ShieldAlert className="size-3.5" aria-hidden />
              ) : entry === "users" ? (
                <Users className="size-3.5" aria-hidden />
              ) : entry === "notes" ? (
                <FileText className="size-3.5" aria-hidden />
              ) : entry === "audit" ? (
                <Activity className="size-3.5" aria-hidden />
              ) : (
                <Radar className="size-3.5" aria-hidden />
              )}
              {entry[0]!.toUpperCase() + entry.slice(1)}
            </Button>
          ))}
        </nav>

        {tab === "stats" ? (
          <section aria-label="Platform statistics" className="space-y-4">
            {stats ? (
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["Users", stats.users, "Registered accounts"],
                    ["Notes", stats.notes, "Total active & guest notes"],
                    ["Owned notes", stats.owned_notes, "Claimed by members"],
                    ["Soft-deleted", stats.deleted_notes, "In moderation trash"],
                    ["Revisions", stats.revisions, "Historical snapshots"],
                    ["Active sessions", stats.active_sessions, "Unlocked edit cookies"],
                    ["Audit entries", stats.audit_entries, "Logged operator actions"],
                  ] as Array<[string, number, string]>
                ).map(([label, value, desc]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs transition-colors hover:border-brand/50"
                  >
                    <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                      {value.toLocaleString()}
                    </dd>
                    <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
                {loading ? "Loading platform telemetry…" : "No stats loaded."}
              </div>
            )}
          </section>
        ) : null}

        {tab === "users" ? (
          <section
            aria-label="User list"
            className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs"
          >
            <table className="w-full text-sm">
              <caption className="sr-only">Registered users</caption>
              <thead className="border-b border-border/60 bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Admin</th>
                  <th scope="col" className="px-4 py-3">Notes</th>
                  <th scope="col" className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {user.email ?? "(no email)"}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_admin ? (
                        <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-medium text-brand-ink">
                          yes
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">no</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{user.note_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {tab === "notes" ? (
          <section
            aria-label="Note moderation"
            className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs"
          >
            <table className="w-full text-sm">
              <caption className="sr-only">Recent notes with moderation actions</caption>
              <thead className="border-b border-border/60 bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">Title</th>
                  <th scope="col" className="px-4 py-3">Owner</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {notes.map((note) => (
                  <tr key={note.public_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {note.title || "(untitled)"}
                      <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                        /{note.public_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {note.owner_email ?? "guest"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] ${
                          note.deleted_at
                            ? "border border-destructive/30 bg-destructive/10 text-destructive"
                            : "border border-brand/30 bg-brand/10 text-brand-ink"
                        }`}
                      >
                        {note.deleted_at ? "deleted" : note.visibility}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
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
          <section
            aria-label="Admin audit log"
            className="rounded-2xl border border-border/70 bg-card shadow-2xs overflow-hidden"
          >
            <ol className="divide-y divide-border/50">
              {audit.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/20 transition-colors"
                >
                  <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono text-xs text-foreground">
                    {entry.action}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {entry.target_id}
                  </span>
                  <time
                    dateTime={entry.created_at}
                    className="text-xs text-muted-foreground"
                  >
                    {formatDate(entry.created_at)}
                  </time>
                </li>
              ))}
              {audit.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No entries.
                </li>
              ) : null}
            </ol>
          </section>
        ) : null}

        {tab === "probes" ? (
          <section
            aria-label="Decoy probe log"
            className="rounded-2xl border border-border/70 bg-card shadow-2xs overflow-hidden"
          >
            <ol className="divide-y divide-border/50">
              {probes.map((probe) => (
                <li
                  key={probe.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/20 transition-colors"
                >
                  <span className="font-mono text-xs font-medium text-brand-ink">
                    {probe.path}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {probe.ip_hash.slice(0, 12)}…
                  </span>
                  <time
                    dateTime={probe.created_at}
                    className="text-xs text-muted-foreground"
                  >
                    {formatDate(probe.created_at)}
                  </time>
                </li>
              ))}
              {probes.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No probes recorded.
                </li>
              ) : null}
            </ol>
          </section>
        ) : null}
      </div>
    </div>
  )
}
