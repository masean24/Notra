"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  FileText,
  FileCode2,
  Shield,
  Plus,
  Search,
  Star,
  Trash2,
  MoreVertical,
  Link2,
  Settings,
  Home,
  FolderOpen,
  Columns2,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { NotraMark } from "@/components/brand/notra-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/client/api"
import type { DashboardNote } from "@/components/dashboard/note-card"

export interface SidebarNote extends DashboardNote {
  content?: unknown
  snippet?: string
}

interface DashboardSidebarProps {
  notes: SidebarNote[]
  selectedNoteId: string | null
  onSelectNote: (noteId: string) => void
  onNewNote: () => void
  onToggleCollapse?: () => void
  userEmail?: string
  currentFilter: "notes" | "favorites" | "trash"
  onFilterChange: (filter: "notes" | "favorites" | "trash") => void
  onNoteDeleted?: (noteId: string) => void
  onNoteUpdated?: (noteId: string, patch: Partial<SidebarNote>) => void
  activeSection?: "home" | "notes" | "studio"
  onSectionChange?: (section: "home" | "notes" | "studio") => void
  wordStats?: { words: number; chars: number }
}

export function formatFileTimestamp(dateString?: string): string {
  if (!dateString) return "now"
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

export function formatFileName(title?: string): string {
  const clean = (title || "Untitled").trim()
  if (clean.includes(".")) return clean
  return `${clean}.md`
}

export function DashboardSidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onNewNote,
  userEmail,
  currentFilter,
  onFilterChange,
  onNoteDeleted,
  onNoteUpdated,
  activeSection = "studio",
  onSectionChange,
  wordStats = { words: 0, chars: 0 },
}: DashboardSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  const displayName = useMemo(() => {
    if (!userEmail) return "Maker"
    const prefix = userEmail.split("@")[0] || "Maker"
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  }, [userEmail])

  const userInitial = useMemo(() => {
    return (displayName.charAt(0) || "N").toUpperCase()
  }, [displayName])

  const favoriteNotes = useMemo(
    () => notes.filter((n) => n.favorite),
    [notes]
  )

  const filteredNotes = useMemo(() => {
    let list = notes

    if (currentFilter === "favorites") {
      list = list.filter((n) => n.favorite)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((n) => {
        const titleMatch = (n.title || "").toLowerCase().includes(q)
        const snippetMatch = (n.snippet || "").toLowerCase().includes(q)
        return titleMatch || snippetMatch
      })
    }

    return list
  }, [notes, currentFilter, searchQuery])

  // Compute storage usage in IndexedDB / local vault
  const totalBytes = useMemo(() => {
    return notes.reduce((acc, note) => {
      const titleSize = (note.title || "").length * 2
      const contentSize = note.content
        ? JSON.stringify(note.content).length * 2
        : 500
      return acc + titleSize + contentSize
    }, 0)
  }, [notes])

  const formattedStorage = useMemo(() => {
    if (totalBytes < 1024) return `${totalBytes} B`
    return `${(totalBytes / 1024).toFixed(1)} KB`
  }, [totalBytes])

  const dailyGoalWords = 1000
  const goalPercent = useMemo(() => {
    if (!wordStats.words) return 8
    return Math.min(Math.max(Math.round((wordStats.words / dailyGoalWords) * 100), 6), 100)
  }, [wordStats.words])

  async function handleToggleFavorite(note: SidebarNote, e: React.MouseEvent) {
    e.stopPropagation()
    const nextFav = !note.favorite
    onNoteUpdated?.(note.public_id, { favorite: nextFav })
    try {
      await apiFetch(`/api/notes/${note.public_id}`, {
        method: "PATCH",
        body: JSON.stringify({ favorite: nextFav }),
      })
      toast.success(nextFav ? "Pinned to favorites." : "Removed from favorites.")
    } catch {
      onNoteUpdated?.(note.public_id, { favorite: !nextFav })
      toast.error("Could not update favorite status.")
    }
  }

  async function handleDelete(note: SidebarNote, e?: React.MouseEvent) {
    e?.stopPropagation()
    try {
      await apiFetch(`/api/notes/${note.public_id}`, { method: "DELETE" })
      onNoteDeleted?.(note.public_id)
      toast.success("Note moved to trash.")
    } catch {
      toast.error("Could not delete note.")
    }
  }

  function handleCopyShareLink(note: SidebarNote, e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}/n/${note.public_id}`
    void navigator.clipboard.writeText(url)
    toast.success("Share link copied to clipboard.")
  }

  return (
    <div className="flex h-full w-full flex-col justify-between p-2.5 select-none text-inherit">
      {/* Top Section: Brand Header + Navigation + Vault Notes */}
      <div className="flex flex-col min-h-0 flex-1 space-y-3">
        {/* Workspace Switcher & New Note Button */}
        <div className="flex items-center justify-between px-1.5 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-xs">
              <NotraMark className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold tracking-tight truncate">
                  Notra
                </span>
                <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-brand-ink">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] opacity-60 truncate">
                {displayName}&apos;s Local Vault
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSearch((v) => !v)}
              title="Search Vault"
              className="flex size-7 items-center justify-center rounded-lg opacity-70 hover:opacity-100 hover:bg-foreground/10 transition-colors"
            >
              <Search className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onNewNote}
              title="New Note (Ctrl+N)"
              className="flex size-7 items-center justify-center rounded-lg bg-brand/20 text-brand-ink hover:bg-brand hover:text-primary-foreground transition-all"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Search Input */}
        {showSearch ? (
          <div className="px-1">
            <Input
              autoFocus
              type="text"
              placeholder="Filter vault notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 text-xs bg-background/60 border-border/60 rounded-lg"
            />
          </div>
        ) : null}

        {/* Main Workspace Views Navigation */}
        <nav className="space-y-0.5">
          <button
            type="button"
            onClick={() => onSectionChange?.("home")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === "home"
                ? "bg-foreground/10 font-semibold opacity-100 shadow-2xs"
                : "opacity-75 hover:opacity-100 hover:bg-foreground/5"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Home className="size-3.5 text-brand-ink" />
              <span>Home Hub</span>
            </span>
            <span className="text-[10px] font-mono opacity-50">⌘1</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onFilterChange("notes")
              onSectionChange?.("notes")
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === "notes" && currentFilter === "notes"
                ? "bg-foreground/10 font-semibold opacity-100 shadow-2xs"
                : "opacity-75 hover:opacity-100 hover:bg-foreground/5"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FolderOpen className="size-3.5 opacity-80" />
              <span>All Notes</span>
            </span>
            <span className="text-[10px] font-mono opacity-60">
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSectionChange?.("studio")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === "studio"
                ? "bg-foreground/10 font-semibold opacity-100 shadow-2xs"
                : "opacity-75 hover:opacity-100 hover:bg-foreground/5"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Columns2 className="size-3.5 text-brand-ink" />
              <span>Split Studio</span>
            </span>
            <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-brand-ink">
              Editor
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onFilterChange(
                currentFilter === "favorites" ? "notes" : "favorites"
              )
              onSectionChange?.("notes")
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === "notes" && currentFilter === "favorites"
                ? "bg-foreground/10 font-semibold opacity-100 shadow-2xs"
                : "opacity-75 hover:opacity-100 hover:bg-foreground/5"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Star className="size-3.5 opacity-80" />
              <span>Favorites</span>
            </span>
            <span className="text-[10px] font-mono opacity-60">
              {favoriteNotes.length}
            </span>
          </button>
        </nav>

        {/* Pinned / Starred Quick Access */}
        {favoriteNotes.length > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between px-2.5 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 font-semibold">
                Pinned in Studio
              </span>
              <span className="text-[10px] font-mono opacity-40">
                {favoriteNotes.length}
              </span>
            </div>
            <div className="space-y-0.5 max-h-28 overflow-y-auto pr-0.5">
              {favoriteNotes.slice(0, 4).map((note) => {
                const isSelected =
                  selectedNoteId === note.public_id &&
                  activeSection === "studio"
                return (
                  <button
                    key={`fav-${note.public_id}`}
                    type="button"
                    onClick={() => onSelectNote(note.public_id)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                      isSelected
                        ? "bg-foreground/12 font-semibold opacity-100"
                        : "opacity-75 hover:opacity-100 hover:bg-foreground/5"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="size-1.5 rounded-full bg-brand shrink-0" />
                      <span className="truncate">
                        {note.title || "Untitled"}
                      </span>
                    </span>
                    <Star
                      className="size-3 shrink-0 text-brand-ink"
                      fill="currentColor"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Vault Notes List */}
        <div className="flex flex-col min-h-0 flex-1 pt-1">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 font-semibold">
              {currentFilter === "favorites"
                ? "Starred Notes"
                : "Recent Vault Notes"}
            </span>
            {currentFilter === "favorites" && (
              <button
                type="button"
                onClick={() => onFilterChange("notes")}
                className="text-[10px] font-mono text-brand-ink hover:underline"
              >
                Show all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredNotes.length === 0 ? (
              <div className="p-5 text-center text-xs opacity-60">
                {searchQuery
                  ? "No matching notes found."
                  : currentFilter === "favorites"
                  ? "No starred notes yet."
                  : "Vault is empty. Click + above."}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected =
                  selectedNoteId === note.public_id &&
                  activeSection === "studio"
                const displayTitle = formatFileName(note.title)
                const timeDisplay = formatFileTimestamp(note.updated_at)

                return (
                  <div
                    key={note.public_id}
                    onClick={() => onSelectNote(note.public_id)}
                    className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-foreground/12 font-semibold opacity-100 shadow-2xs"
                        : "opacity-75 hover:opacity-100 hover:bg-foreground/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {note.title?.toLowerCase().includes("api") ||
                      note.title?.toLowerCase().includes("code") ? (
                        <FileCode2
                          className={`size-3.5 shrink-0 ${
                            isSelected ? "text-brand-ink" : "opacity-70"
                          }`}
                        />
                      ) : note.title?.toLowerCase().includes("spec") ||
                        note.title?.toLowerCase().includes("arch") ? (
                        <Shield
                          className={`size-3.5 shrink-0 ${
                            isSelected ? "text-brand-ink" : "opacity-70"
                          }`}
                        />
                      ) : (
                        <FileText
                          className={`size-3.5 shrink-0 ${
                            isSelected ? "text-brand-ink" : "opacity-70"
                          }`}
                        />
                      )}

                      <span className="truncate">{displayTitle}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono opacity-50 group-hover:hidden">
                        {timeDisplay}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-foreground/10 transition-opacity"
                        >
                          <MoreVertical className="size-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                          <DropdownMenuItem
                            onClick={(e) => handleToggleFavorite(note, e)}
                          >
                            <Star className="size-3.5 mr-2 text-brand-ink" />
                            <span>{note.favorite ? "Unstar" : "Star"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleCopyShareLink(note, e)}
                          >
                            <Link2 className="size-3.5 mr-2 text-brand-ink" />
                            <span>Copy Share Link</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDelete(note, e)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            <span>Move to Trash</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Writing Flow Card + User Profile Footer */}
      <div className="pt-2.5 border-t border-border/40 space-y-2">
        {/* Daily Writing Flow & Local Storage Card */}
        <div className="rounded-xl p-2.5 bg-foreground/[0.04] border border-border/50 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium opacity-80 flex items-center gap-1.5">
              <Sparkles className="size-3 text-brand-ink" />
              Session Flow
            </span>
            <span className="font-mono text-[10px] text-brand-ink font-semibold">
              {wordStats.words.toLocaleString()} / {dailyGoalWords.toLocaleString()}w
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono opacity-60 pt-0.5">
            <span>IndexedDB • 0ms</span>
            <span>{formattedStorage}</span>
          </div>
        </div>

        {/* User Profile Row */}
        <div className="flex items-center justify-between px-1.5 py-1 rounded-lg hover:bg-foreground/5 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/25 text-brand-ink text-[11px] font-bold">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-none truncate">
                {displayName}
              </p>
              <p className="text-[10px] font-mono opacity-55 truncate mt-0.5">
                {userEmail || "Local Vault"}
              </p>
            </div>
          </div>

          <Link
            href="/settings"
            className="flex size-6 items-center justify-center rounded-md opacity-70 hover:opacity-100 hover:bg-foreground/10 transition-colors"
            title="Account & BYOK Settings"
          >
            <Settings className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
