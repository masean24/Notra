"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Share2,
  PanelLeft,
  Plus,
  Columns2,
  Search,
  ArrowLeft,
  Star,
  Trash2,
  Link2,
  FileText,
  FileCode2,
  Shield,
  ArrowUpRight,
  FolderOpen,
} from "lucide-react"
import { toast } from "sonner"

import {
  DashboardSidebar,
  formatFileName,
  formatFileTimestamp,
  type SidebarNote,
} from "@/components/dashboard/dashboard-sidebar"
import {
  NoteEditor,
  type EditorApi,
  type EditorStats,
} from "@/components/editor/note-editor"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/client/api"
import { toHtml, toPlainText } from "@/lib/notes/serialize"

interface DashboardWorkspaceProps {
  initialNotes: SidebarNote[]
  userEmail?: string
  initialNoteId?: string
}

type StudioLayoutMode = "editor" | "split"
type WorkspaceSection = "home" | "notes" | "studio"

export function DashboardWorkspace({
  initialNotes,
  userEmail,
  initialNoteId,
}: DashboardWorkspaceProps) {
  const router = useRouter()

  const [notes, setNotes] = useState<SidebarNote[]>(initialNotes)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => {
    if (
      initialNoteId &&
      initialNotes.some((n) => n.public_id === initialNoteId)
    ) {
      return initialNoteId
    }
    return initialNotes[0]?.public_id ?? null
  })

  // Stable key for NoteEditor that only increments when explicitly switching notes or starting a new draft
  const [editorSessionKey, setEditorSessionKey] = useState<number>(0)

  // Workspace view section: Home Hub ("home"), All Notes ("notes"), or Studio Editor ("studio")
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(() => {
    if (initialNoteId) return "studio"
    return "home"
  })

  const [isNewDraft, setIsNewDraft] = useState<boolean>(
    initialNotes.length === 0
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentFilter, setCurrentFilter] = useState<
    "notes" | "favorites" | "trash"
  >("notes")

  // Studio layout: default "editor" (full /new experience), optional "split" (with live preview pane)
  const [layoutMode, setLayoutMode] = useState<StudioLayoutMode>("editor")
  const [readerSerif, setReaderSerif] = useState<boolean>(false)

  // Live preview & stats states
  const [previewTitle, setPreviewTitle] = useState<string>("")
  const [editorStats, setEditorStats] = useState<EditorStats>({
    words: 0,
    chars: 0,
    line: 1,
    col: 1,
    html: "",
    markdown: "",
    saveStatus: "saved",
  })

  // Home Hub Omnibox & All Notes search state
  const [omniboxQuery, setOmniboxQuery] = useState("")
  const [directorySearch, setDirectorySearch] = useState("")

  // Reference to internal NoteEditor triggers (Share, AI, etc.)
  const editorApiRef = useRef<EditorApi | null>(null)

  const selectedNote = useMemo(
    () => notes.find((n) => n.public_id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  )

  const displayName = useMemo(() => {
    if (!userEmail) return "Maker"
    const prefix = userEmail.split("@")[0] || "Maker"
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  }, [userEmail])

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }, [])

  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }, [])

  // Keyboard shortcuts: Cmd/Ctrl+1 (Home), Cmd/Ctrl+2 (Studio)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault()
        setActiveSection("home")
      } else if ((e.metaKey || e.ctrlKey) && e.key === "2") {
        e.preventDefault()
        setActiveSection("studio")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Keep preview initialized when switching notes
  useEffect(() => {
    if (isNewDraft || !selectedNote) {
      setPreviewTitle("")
      setEditorStats((prev) => ({
        ...prev,
        words: 0,
        chars: 0,
        html: "",
      }))
      return
    }
    setPreviewTitle(selectedNote.title || "Untitled")
    if (selectedNote.content) {
      try {
        const rawHtml = toHtml(selectedNote.content)
        const plain = toPlainText(selectedNote.content).trim()
        const words = plain ? plain.split(/\s+/).length : 0
        setEditorStats((prev) => ({
          ...prev,
          words,
          chars: plain.length,
          html: rawHtml,
        }))
      } catch {
        setEditorStats((prev) => ({ ...prev, html: "" }))
      }
    } else {
      setEditorStats((prev) => ({
        ...prev,
        words: 0,
        chars: 0,
        html: "",
      }))
    }
  }, [selectedNote, isNewDraft])

  const handleSelectNote = useCallback(
    (noteId: string) => {
      if (selectedNoteId !== noteId || isNewDraft) {
        setEditorSessionKey((k) => k + 1)
      }
      setIsNewDraft(false)
      setSelectedNoteId(noteId)
      setActiveSection("studio")
      window.history.replaceState(null, "", `/dashboard?note=${noteId}`)
    },
    [selectedNoteId, isNewDraft]
  )

  const handleNewNote = useCallback(() => {
    setEditorSessionKey((k) => k + 1)
    setIsNewDraft(true)
    setSelectedNoteId(null)
    setPreviewTitle("")
    setEditorStats({
      words: 0,
      chars: 0,
      line: 1,
      col: 1,
      html: "",
      markdown: "",
      saveStatus: "saved",
    })
    setActiveSection("studio")
    window.history.replaceState(null, "", `/dashboard`)
  }, [])

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setPreviewTitle(newTitle || "Untitled")
      if (!selectedNoteId) return
      setNotes((prev) =>
        prev.map((n) =>
          n.public_id === selectedNoteId
            ? { ...n, title: newTitle, updated_at: new Date().toISOString() }
            : n
        )
      )
    },
    [selectedNoteId]
  )

  const handleNoteSaved = useCallback(
    (saved: { publicId: string; title: string; content?: unknown }) => {
      setPreviewTitle(saved.title)
      let snippet = ""
      if (saved.content) {
        try {
          snippet = toPlainText(saved.content).slice(0, 120).trim()
        } catch {}
      }

      setNotes((prev) => {
        const exists = prev.some((n) => n.public_id === saved.publicId)
        if (exists) {
          return prev.map((n) =>
            n.public_id === saved.publicId
              ? {
                  ...n,
                  title: saved.title,
                  content: saved.content ?? n.content,
                  snippet: snippet || n.snippet,
                  updated_at: new Date().toISOString(),
                }
              : n
          )
        }
        const now = new Date().toISOString()
        const newNote: SidebarNote = {
          public_id: saved.publicId,
          title: saved.title,
          favorite: false,
          visibility: "public",
          editing_policy: "account",
          expires_at: null,
          is_expired: false,
          created_at: now,
          updated_at: now,
          content: saved.content,
          snippet,
        }
        return [newNote, ...prev]
      })
      setSelectedNoteId(saved.publicId)
      setIsNewDraft(false)
      window.history.replaceState(null, "", `/dashboard?note=${saved.publicId}`)
      router.refresh()
    },
    [router]
  )

  const handleNoteDeleted = useCallback(
    (deletedId: string) => {
      setNotes((prev) => {
        const remaining = prev.filter((n) => n.public_id !== deletedId)
        if (selectedNoteId === deletedId) {
          const next = remaining[0]?.public_id ?? null
          setSelectedNoteId(next)
          setIsNewDraft(next === null)
          setEditorSessionKey((k) => k + 1)
        }
        return remaining
      })
      router.refresh()
    },
    [selectedNoteId, router]
  )

  const handleNoteUpdated = useCallback(
    (noteId: string, patch: Partial<SidebarNote>) => {
      setNotes((prev) =>
        prev.map((n) => (n.public_id === noteId ? { ...n, ...patch } : n))
      )
    },
    []
  )

  async function handleToggleFavoriteInline(
    note: SidebarNote,
    e: React.MouseEvent
  ) {
    e.stopPropagation()
    const nextFav = !note.favorite
    handleNoteUpdated(note.public_id, { favorite: nextFav })
    try {
      await apiFetch(`/api/notes/${note.public_id}`, {
        method: "PATCH",
        body: JSON.stringify({ favorite: nextFav }),
      })
      toast.success(
        nextFav ? "Pinned to favorites." : "Removed from favorites."
      )
    } catch {
      handleNoteUpdated(note.public_id, { favorite: !nextFav })
      toast.error("Could not update favorite status.")
    }
  }

  async function handleDeleteInline(note: SidebarNote, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await apiFetch(`/api/notes/${note.public_id}`, { method: "DELETE" })
      handleNoteDeleted(note.public_id)
      toast.success("Note moved to trash.")
    } catch {
      toast.error("Could not delete note.")
    }
  }

  function handleCopyShareLinkInline(note: SidebarNote, e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}/n/${note.public_id}`
    void navigator.clipboard.writeText(url)
    toast.success("Share link copied to clipboard.")
  }

  // Pinned / Featured Bento Notes for Home Hub (Starred notes first, then recent)
  const featuredBentoNotes = useMemo(() => {
    const favs = notes.filter((n) => n.favorite)
    const others = notes.filter((n) => !n.favorite)
    return [...favs, ...others].slice(0, 3)
  }, [notes])

  // Filtered recent notes for Home Hub when typing in the Omnibox
  const homeRecentNotes = useMemo(() => {
    if (!omniboxQuery.trim()) return notes.slice(0, 8)
    const q = omniboxQuery.toLowerCase()
    return notes.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.snippet || "").toLowerCase().includes(q)
    )
  }, [notes, omniboxQuery])

  // Filtered notes for All Vault Notes directory view
  const directoryNotes = useMemo(() => {
    let list = notes
    if (currentFilter === "favorites") {
      list = list.filter((n) => n.favorite)
    }
    if (directorySearch.trim()) {
      const q = directorySearch.toLowerCase()
      list = list.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          (n.snippet || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [notes, currentFilter, directorySearch])

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-sidebar text-foreground sm:p-2 sm:gap-2 transition-colors duration-300">
      {/* Mobile Backdrop when sidebar is open on small viewports */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Left Collapsible App Shell Sidebar */}
      <aside
        className={`${
          sidebarCollapsed
            ? "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:pointer-events-none"
            : "translate-x-0 w-[256px]"
        } fixed md:relative z-40 h-full shrink-0 overflow-hidden bg-sidebar text-sidebar-foreground transition-all duration-200 ease-out`}
      >
        <div className="w-[256px] h-full">
          <DashboardSidebar
            notes={notes}
            selectedNoteId={isNewDraft ? null : selectedNoteId}
            onSelectNote={(id) => {
              handleSelectNote(id)
              if (window.innerWidth < 768) {
                setSidebarCollapsed(true)
              }
            }}
            onNewNote={() => {
              handleNewNote()
              if (window.innerWidth < 768) {
                setSidebarCollapsed(true)
              }
            }}
            onToggleCollapse={() => setSidebarCollapsed(true)}
            userEmail={userEmail}
            currentFilter={currentFilter}
            onFilterChange={setCurrentFilter}
            onNoteDeleted={handleNoteDeleted}
            onNoteUpdated={handleNoteUpdated}
            activeSection={activeSection}
            onSectionChange={(sec) => {
              setActiveSection(sec)
              if (window.innerWidth < 768) {
                setSidebarCollapsed(true)
              }
            }}
            wordStats={{ words: editorStats.words, chars: editorStats.chars }}
          />
        </div>
      </aside>

      {/* Right Floating Workspace Canvas */}
      <main className="flex-1 flex flex-col min-w-0 h-full rounded-none sm:rounded-2xl border border-border/80 bg-background text-foreground shadow-xl overflow-hidden transition-colors duration-300">
        {/* Top Utility Header Bar (shown on Home Hub and All Notes; Studio uses NoteEditor's full /new header!) */}
        {activeSection !== "studio" && (
          <header className="h-14 px-4 sm:px-6 border-b border-border/60 bg-background/85 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
            {/* Left: Sidebar Toggle + Breadcrumb + Sync Badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={
                  sidebarCollapsed
                    ? "Expand Sidebar"
                    : "Collapse Sidebar"
                }
              >
                <PanelLeft className="size-4" />
              </button>

              <span className="text-muted-foreground/40 text-xs">/</span>

              <div className="flex items-center gap-2 text-xs min-w-0">
                <span className="font-semibold text-foreground truncate">
                  {activeSection === "home"
                    ? "Home Hub"
                    : currentFilter === "favorites"
                    ? "Starred Notes"
                    : "All Notes"}
                </span>

                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand/10 text-brand-ink border border-brand/25">
                  <span className="size-1.5 rounded-full bg-brand" />
                  Synced
                </span>
              </div>
            </div>

            {/* Right: Theme Toggle & Quick New Note */}
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle className="size-8 rounded-lg border border-border/80 bg-card/70 text-muted-foreground hover:text-foreground" />

              <Button
                size="sm"
                onClick={handleNewNote}
                className="h-8 px-3 text-xs rounded-lg gap-1.5 font-semibold"
              >
                <Plus className="size-3.5" />
                <span>New Note</span>
              </Button>
            </div>
          </header>
        )}

        {/* View 1: HOME HUB */}
        {activeSection === "home" && (
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Greeting Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    {formattedToday} • WORKSPACE OVERVIEW
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {timeGreeting}, {displayName}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleNewNote}
                    className="h-9 px-4 rounded-xl text-xs font-semibold gap-2 shadow-xs"
                  >
                    <Plus className="size-3.5" />
                    <span>Write New Note</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveSection("studio")}
                    className="h-9 px-4 rounded-xl text-xs font-medium gap-2 bg-card hover:bg-muted"
                  >
                    <Columns2 className="size-3.5 text-brand-ink" />
                    <span>Open Editor</span>
                  </Button>
                </div>
              </div>

              {/* Quick Search & Actions Card */}
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5 bg-card shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-ink">
                    <Search className="size-4" />
                  </div>
                  <input
                    type="text"
                    value={omniboxQuery}
                    onChange={(e) => setOmniboxQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && omniboxQuery.trim()) {
                        if (homeRecentNotes.length > 0) {
                          handleSelectNote(homeRecentNotes[0].public_id)
                        } else {
                          handleNewNote()
                        }
                      }
                    }}
                    placeholder="Search your notes, or press Enter to jump into the editor..."
                    className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                  {omniboxQuery && (
                    <button
                      type="button"
                      onClick={() => setOmniboxQuery("")}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Pill Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-border/60">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">
                    Quick Actions:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection("studio")
                      setTimeout(() => {
                        editorApiRef.current?.openAi()
                      }, 80)
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border/80 bg-muted/50 text-foreground hover:border-brand/50 hover:bg-brand/10 transition-colors"
                  >
                    <Sparkles className="size-3.5 text-brand-ink" />
                    <span>Ask AI Assistant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode("split")
                      setActiveSection("studio")
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border/80 bg-muted/50 text-foreground hover:border-brand/50 hover:bg-brand/10 transition-colors"
                  >
                    <Columns2 className="size-3.5 text-brand-ink" />
                    <span>Split Preview Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFilter("favorites")
                      setActiveSection("notes")
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border/80 bg-muted/50 text-foreground hover:border-brand/50 hover:bg-brand/10 transition-colors"
                  >
                    <Star className="size-3.5 text-brand-ink" />
                    <span>
                      Starred Notes ({notes.filter((n) => n.favorite).length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection("studio")
                      setTimeout(() => {
                        editorApiRef.current?.openShare()
                      }, 80)
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border/80 bg-muted/50 text-foreground hover:border-brand/50 hover:bg-brand/10 transition-colors"
                  >
                    <Share2 className="size-3.5 text-brand-ink" />
                    <span>Share Active Document</span>
                  </button>
                </div>
              </div>

              {/* Pinned / Active Notes Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pinned &amp; Active Notes
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFilter("notes")
                      setActiveSection("notes")
                    }}
                    className="text-xs font-medium text-brand-ink hover:underline"
                  >
                    View all {notes.length} notes →
                  </button>
                </div>

                {featuredBentoNotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3 bg-card/50">
                    <p className="text-sm font-semibold text-foreground">
                      You don&apos;t have any saved notes yet.
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Create your first note with rich formatting, slash commands, templates, AI assistant, and instant link sharing.
                    </p>
                    <Button size="sm" onClick={handleNewNote} className="mt-1">
                      <Plus className="size-3.5 mr-1.5" />
                      Create First Note
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {featuredBentoNotes.map((note) => {
                      const isCurrent = selectedNoteId === note.public_id
                      return (
                        <div
                          key={`bento-${note.public_id}`}
                          onClick={() => handleSelectNote(note.public_id)}
                          className="group cursor-pointer rounded-2xl border border-border/80 p-5 bg-card hover:border-brand/50 hover:shadow-md transition-all flex flex-col justify-between min-h-[152px] shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span
                                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                                  note.favorite
                                    ? "bg-brand/15 text-brand-ink"
                                    : isCurrent
                                    ? "bg-brand/10 text-brand-ink"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {note.favorite
                                  ? "★ Starred"
                                  : isCurrent
                                  ? "Active in Editor"
                                  : "Recent Note"}
                              </span>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {formatFileTimestamp(note.updated_at)}
                              </span>
                            </div>

                            <h3 className="font-semibold text-base text-foreground leading-snug group-hover:text-brand-ink transition-colors line-clamp-1">
                              {note.title || "Untitled Note"}
                            </h3>

                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                              {note.snippet ||
                                "Click to open and edit in the workspace editor..."}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-mono text-muted-foreground">
                            <span className="truncate max-w-[140px]">
                              {formatFileName(note.title)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-brand-ink font-sans font-medium">
                              Open <ArrowUpRight className="size-3.5" />
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recent Notes List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {omniboxQuery
                      ? `Matching Notes (${homeRecentNotes.length})`
                      : "Recent Notes"}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Click any note to open in the editor
                  </span>
                </div>

                {homeRecentNotes.length === 0 ? (
                  <div className="rounded-xl border border-border/80 bg-card p-6 text-center text-xs text-muted-foreground">
                    No notes match &ldquo;{omniboxQuery}&rdquo;. Press Enter to
                    draft a new note.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/80 divide-y divide-border/60 overflow-hidden bg-card shadow-2xs">
                    {homeRecentNotes.map((note) => (
                      <div
                        key={`recent-${note.public_id}`}
                        onClick={() => handleSelectNote(note.public_id)}
                        className="group px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/60 text-brand-ink">
                            {note.title?.toLowerCase().includes("api") ||
                            note.title?.toLowerCase().includes("code") ? (
                              <FileCode2 className="size-4" />
                            ) : note.title?.toLowerCase().includes("spec") ||
                              note.title?.toLowerCase().includes("arch") ? (
                              <Shield className="size-4" />
                            ) : (
                              <FileText className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate group-hover:text-brand-ink transition-colors">
                                {note.title || "Untitled Note"}
                              </p>
                              {note.visibility === "public" ||
                              note.visibility === "unlisted" ? (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand/10 text-brand-ink">
                                  Shared
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {note.snippet || "Empty document"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavoriteInline(note, e)}
                            title={
                              note.favorite
                                ? "Remove from favorites"
                                : "Pin to favorites"
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              note.favorite
                                ? "text-brand-ink"
                                : "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            <Star
                              className="size-4"
                              fill={note.favorite ? "currentColor" : "none"}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleCopyShareLinkInline(note, e)}
                            title="Copy share link"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                          >
                            <Link2 className="size-4" />
                          </button>

                          <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                            {formatFileTimestamp(note.updated_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View 2: ALL NOTES / FAVORITES DIRECTORY */}
        {activeSection === "notes" && (
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    NOTES DIRECTORY
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
                    {currentFilter === "favorites"
                      ? "Starred Notes"
                      : "All Notes"}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/50 text-xs">
                    <button
                      type="button"
                      onClick={() => setCurrentFilter("notes")}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        currentFilter === "notes"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({notes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentFilter("favorites")}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        currentFilter === "favorites"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Starred ({notes.filter((n) => n.favorite).length})
                    </button>
                  </div>

                  <Button size="sm" onClick={handleNewNote} className="gap-1.5">
                    <Plus className="size-3.5" />
                    <span>New Note</span>
                  </Button>
                </div>
              </div>

              {/* Filter Search Bar */}
              <div className="relative">
                <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter notes by title or content snippet..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-card border-border/80 text-sm"
                />
              </div>

              {/* Notes Grid */}
              {directoryNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2 bg-card/50">
                  <FolderOpen className="size-7 mx-auto text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">No notes found</p>
                  <p className="text-xs text-muted-foreground">
                    {directorySearch
                      ? `No notes match "${directorySearch}".`
                      : currentFilter === "favorites"
                      ? "Star any note to pin it here for instant access."
                      : "Create your first note to populate your workspace."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {directoryNotes.map((note) => (
                    <div
                      key={`dir-${note.public_id}`}
                      onClick={() => handleSelectNote(note.public_id)}
                      className="group cursor-pointer rounded-2xl border border-border/80 p-5 bg-card hover:border-brand/50 hover:shadow-md transition-all flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-base text-foreground group-hover:text-brand-ink transition-colors line-clamp-1">
                            {note.title || "Untitled Note"}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) =>
                                handleToggleFavoriteInline(note, e)
                              }
                              className={`p-1 rounded-md transition-colors ${
                                note.favorite
                                  ? "text-brand-ink"
                                  : "text-muted-foreground/50 hover:text-foreground"
                              }`}
                              title={
                                note.favorite ? "Unstar note" : "Star note"
                              }
                            >
                              <Star
                                className="size-4"
                                fill={note.favorite ? "currentColor" : "none"}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCopyShareLinkInline(note, e)}
                              className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground transition-colors"
                              title="Copy share link"
                            >
                              <Link2 className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteInline(note, e)}
                              className="p-1 rounded-md text-muted-foreground/60 hover:text-destructive transition-colors"
                              title="Move to trash"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                          {note.snippet || "No additional text content."}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">Updated {formatFileTimestamp(note.updated_at)}</span>
                        <span className="text-brand-ink font-medium group-hover:underline">
                          Open Editor →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 3: FULL /NEW EDITOR + OPTIONAL SPLIT PREVIEW */}
        <div
          className={
            activeSection === "studio"
              ? "flex-1 flex min-h-0 overflow-hidden"
              : "hidden"
          }
        >
          {/* Left / Main Pane: Full NoteEditor (identical feature set to /new) */}
          <div
            className={
              layoutMode === "split"
                ? "w-full lg:w-1/2 h-full flex flex-col border-r border-border/60 overflow-hidden"
                : "w-full h-full flex flex-col overflow-hidden"
            }
          >
            <NoteEditor
              key={`editor-session-${editorSessionKey}`}
              publicId={isNewDraft ? undefined : selectedNote?.public_id}
              initialTitle={isNewDraft ? "" : selectedNote?.title ?? ""}
              initialContent={isNewDraft ? undefined : selectedNote?.content}
              serverUpdatedAt={isNewDraft ? null : selectedNote?.updated_at}
              isAuthenticated={true}
              embedded={true}
              hideHeader={false}
              editorApiRef={editorApiRef}
              onTitleChange={handleTitleChange}
              onNoteChange={handleNoteSaved}
              onEditorStatsChange={setEditorStats}
              leftHeaderSlot={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed((v) => !v)}
                    className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                  >
                    <PanelLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("home")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/70 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="size-3.5" />
                    <span className="hidden sm:inline">Home</span>
                  </button>
                </div>
              }
              extraHeaderActions={
                <button
                  type="button"
                  onClick={() =>
                    setLayoutMode((m) => (m === "split" ? "editor" : "split"))
                  }
                  className={`hidden lg:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                    layoutMode === "split"
                      ? "border-brand/40 bg-brand/10 text-brand-ink"
                      : "border-border/80 bg-card/70 text-muted-foreground hover:text-foreground"
                  }`}
                  title="Toggle side-by-side Live Preview"
                >
                  <Columns2 className="size-3.5" />
                  <span>{layoutMode === "split" ? "Split On" : "Split"}</span>
                </button>
              }
            />
          </div>

          {/* Right Pane: Optional Synchronized Live Preview Card (when Split is toggled on) */}
          {layoutMode === "split" && (
            <div className="hidden lg:flex lg:w-1/2 h-full p-5 overflow-y-auto bg-muted/30">
              <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border/80 bg-card p-6 sm:p-10 shadow-sm flex flex-col h-fit min-h-full">
                {/* Reader Card Header */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-border/60 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2 text-brand-ink font-semibold">
                    <span className="size-2 rounded-full bg-brand" />
                    Live Document Preview
                  </span>

                  <button
                    type="button"
                    onClick={() => setReaderSerif((v) => !v)}
                    className="px-2.5 py-1 rounded-md border border-border/80 bg-muted/50 hover:bg-muted text-foreground font-medium transition-colors"
                  >
                    Font: {readerSerif ? "Serif" : "Sans"}
                  </button>
                </div>

                {/* Reader Card Body */}
                <article
                  className={`max-w-none flex-1 ${
                    readerSerif ? "font-serif-editor" : "font-sans-editor"
                  }`}
                >
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-6">
                    {previewTitle || "Untitled Note"}
                  </h1>

                  {editorStats.html && editorStats.html !== "<p></p>" ? (
                    <div
                      className="tiptap max-w-none leading-relaxed text-foreground/90"
                      dangerouslySetInnerHTML={{ __html: editorStats.html }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Start typing in the editor on the left to see your live preview here...
                    </p>
                  )}
                </article>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
