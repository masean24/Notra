"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
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
  BookOpen,
  PenLine,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/client/api"
import { toHtml, toPlainText } from "@/lib/notes/serialize"

interface DashboardWorkspaceProps {
  initialNotes: SidebarNote[]
  userEmail?: string
  initialNoteId?: string
}

type StudioLayoutMode = "editor" | "split" | "preview"
type WorkspaceSection = "home" | "notes" | "studio"
type CanvasVibe = "hybrid" | "obsidian" | "paper"

export function DashboardWorkspace({
  initialNotes,
  userEmail,
  initialNoteId,
}: DashboardWorkspaceProps) {
  const router = useRouter()
  const { setTheme } = useTheme()

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

  // Workspace view section: Home Hub ("home"), All Notes ("notes"), or Split Studio ("studio")
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

  // Canvas Vibe: Hybrid Paper (Dark Shell + Warm Paper Canvas), Obsidian Dark, or Warm Light
  const [canvasVibe, setCanvasVibe] = useState<CanvasVibe>("hybrid")

  // Studio Tri-mode layout: "editor" | "split" | "preview"
  const [layoutMode, setLayoutMode] = useState<StudioLayoutMode>("split")
  // Reader Card Typography toggle: Editorial Serif vs Clean Sans
  const [readerSerif, setReaderSerif] = useState<boolean>(true)

  // Live preview & stats states for Split Studio Reader Card & Status Bar
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

  // Handle Canvas Vibe switch and sync with next-themes for editor & portaled modals
  const handleVibeChange = useCallback(
    (vibe: CanvasVibe) => {
      setCanvasVibe(vibe)
      if (vibe === "obsidian") {
        setTheme("dark")
      } else {
        setTheme("light")
      }
    },
    [setTheme]
  )

  // Keyboard shortcuts: Cmd/Ctrl+1 (Home), Cmd/Ctrl+2 (Split Studio)
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

  const handleSelectNote = useCallback((noteId: string) => {
    setIsNewDraft(false)
    setSelectedNoteId(noteId)
    setActiveSection("studio")
    window.history.replaceState(null, "", `/dashboard?note=${noteId}`)
  }, [])

  const handleNewNote = useCallback(() => {
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
    (saved: { publicId: string; title: string }) => {
      setPreviewTitle(saved.title)
      setNotes((prev) => {
        const exists = prev.some((n) => n.public_id === saved.publicId)
        if (exists) {
          return prev.map((n) =>
            n.public_id === saved.publicId
              ? {
                  ...n,
                  title: saved.title,
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
          visibility: "private",
          editing_policy: "owner_only",
          expires_at: null,
          is_expired: false,
          created_at: now,
          updated_at: now,
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

  const formattedDocTitle = useMemo(() => {
    const raw =
      previewTitle ||
      selectedNote?.title ||
      (isNewDraft ? "Untitled Draft" : "Untitled")
    const clean = raw.trim() || "Untitled"
    return clean.includes(".") ? clean : `${clean}.md`
  }, [previewTitle, selectedNote, isNewDraft])

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

  // Outer App Shell classes based on Canvas Vibe (Notra Quiet Premium tokens)
  const outerShellClasses = useMemo(() => {
    if (canvasVibe === "obsidian") {
      return "bg-[#121212] text-[#E6E4DD]"
    }
    if (canvasVibe === "paper") {
      return "bg-[#EFECE6] text-[#171717]"
    }
    // Hybrid Paper default: Deep Charcoal outer shell + Warm Paper inset canvas
    return "bg-[#171717] text-[#FAF9F6]"
  }, [canvasVibe])

  // Floating Inset Canvas classes based on Canvas Vibe
  const insetCanvasClasses = useMemo(() => {
    if (canvasVibe === "obsidian") {
      return "bg-[#1A1A1A] text-[#FAF9F6] border-white/10"
    }
    return "bg-[#FAF9F6] text-[#171717] border-[#E7E5E0]"
  }, [canvasVibe])

  return (
    <div
      className={`flex h-dvh w-screen overflow-hidden sm:p-2 sm:gap-2 transition-colors duration-300 ${outerShellClasses}`}
    >
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
            : "translate-x-0 w-[252px]"
        } fixed md:relative z-40 h-full shrink-0 overflow-hidden transition-all duration-200 ease-out ${
          canvasVibe === "paper"
            ? "bg-[#EFECE6] text-[#171717]"
            : "bg-[#171717] text-[#FAF9F6]"
        }`}
      >
        <div className="w-[252px] h-full">
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

      {/* Right Floating Inset Canvas */}
      <main
        className={`flex-1 flex flex-col min-w-0 h-full rounded-none sm:rounded-2xl border shadow-2xl overflow-hidden transition-colors duration-300 ${insetCanvasClasses}`}
      >
        {/* 1. Top Utility Header Bar */}
        <header className="h-12 px-3 sm:px-5 border-b border-border/60 flex items-center justify-between gap-2 shrink-0">
          {/* Left: Sidebar Toggle + Breadcrumb + Sync Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="flex size-7 items-center justify-center rounded-lg opacity-70 hover:opacity-100 hover:bg-foreground/8 transition-colors"
              title={
                sidebarCollapsed
                  ? "Expand Sidebar (Ctrl+B)"
                  : "Collapse Sidebar (Ctrl+B)"
              }
            >
              <PanelLeft className="size-4" />
            </button>

            <span className="opacity-30 text-xs">/</span>

            <div className="flex items-center gap-2 text-xs min-w-0">
              <button
                type="button"
                onClick={() => setActiveSection("home")}
                className={`truncate transition-opacity ${
                  activeSection === "home"
                    ? "font-semibold opacity-100"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {activeSection === "home"
                  ? "Home Hub"
                  : activeSection === "notes"
                  ? currentFilter === "favorites"
                    ? "Starred Vault Notes"
                    : "All Vault Notes"
                  : "Split Studio"}
              </button>

              {activeSection === "studio" && (
                <>
                  <span className="opacity-30">/</span>
                  <span className="font-mono text-[11px] font-medium truncate max-w-[160px] sm:max-w-[260px]">
                    {formattedDocTitle}
                  </span>
                </>
              )}

              <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand/15 text-brand-ink border border-brand/30">
                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                {editorStats.saveStatus === "syncing"
                  ? "Syncing..."
                  : editorStats.saveStatus === "offline"
                  ? "Saved Offline"
                  : "Saved in IndexedDB"}
              </span>
            </div>
          </div>

          {/* Right: Canvas Vibe Switcher & Quick New Note */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg border border-border/70 bg-foreground/[0.03] text-[11px]">
              <button
                type="button"
                onClick={() => handleVibeChange("hybrid")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  canvasVibe === "hybrid"
                    ? "bg-foreground text-background shadow-2xs"
                    : "opacity-65 hover:opacity-100"
                }`}
              >
                Hybrid Paper
              </button>
              <button
                type="button"
                onClick={() => handleVibeChange("obsidian")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  canvasVibe === "obsidian"
                    ? "bg-foreground text-background shadow-2xs"
                    : "opacity-65 hover:opacity-100"
                }`}
              >
                Obsidian
              </button>
              <button
                type="button"
                onClick={() => handleVibeChange("paper")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  canvasVibe === "paper"
                    ? "bg-foreground text-background shadow-2xs"
                    : "opacity-65 hover:opacity-100"
                }`}
              >
                Warm Light
              </button>
            </div>

            {activeSection !== "studio" && (
              <Button
                size="xs"
                onClick={handleNewNote}
                className="h-7 px-2.5 text-[11px] rounded-lg gap-1.5 font-medium"
              >
                <Plus className="size-3.5" />
                <span>New Note</span>
              </Button>
            )}
          </div>
        </header>

        {/* 2. View 1: HOME HUB (Greeting + Ask Notra Omnibox + Pinned Bento + Recent Notes) */}
        {activeSection === "home" && (
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-7">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Greeting Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest opacity-55 mb-1.5">
                    {formattedToday} • LOCAL-FIRST VAULT • BYOK GEMINI READY
                  </p>
                  <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">
                    {timeGreeting}, {displayName}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNewNote}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-all shadow-xs"
                  >
                    <Plus className="size-3.5" />
                    <span>Write New Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("studio")}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-border/80 bg-foreground/[0.03] hover:bg-foreground/[0.07] transition-all"
                  >
                    <Columns2 className="size-3.5 text-brand-ink" />
                    <span>Open Split Studio</span>
                  </button>
                </div>
              </div>

              {/* Ask Notra / Quick Vault Omnibox Card */}
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5 bg-foreground/[0.02] shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-ink">
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
                    placeholder="Search your local vault, or press Enter to jump into Split Studio..."
                    className="w-full bg-transparent text-sm focus:outline-none placeholder:opacity-50"
                  />
                  {omniboxQuery && (
                    <button
                      type="button"
                      onClick={() => setOmniboxQuery("")}
                      className="text-[11px] font-mono opacity-60 hover:opacity-100"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Pill Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 border-t border-border/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider opacity-45 mr-1">
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
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border/70 bg-background/60 hover:border-brand/60 transition-colors"
                  >
                    <Sparkles className="size-3 text-brand-ink" />
                    <span>Ask AI Assistant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode("split")
                      setActiveSection("studio")
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border/70 bg-background/60 hover:border-brand/60 transition-colors"
                  >
                    <Columns2 className="size-3 text-brand-ink" />
                    <span>Launch Side-by-Side Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFilter("favorites")
                      setActiveSection("notes")
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border/70 bg-background/60 hover:border-brand/60 transition-colors"
                  >
                    <Star className="size-3 text-brand-ink" />
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
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border/70 bg-background/60 hover:border-brand/60 transition-colors"
                  >
                    <Share2 className="size-3 text-brand-ink" />
                    <span>Share Active Document</span>
                  </button>
                </div>
              </div>

              {/* Pinned / Active in Studio Bento Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider opacity-60 font-semibold">
                    Pinned &amp; Active in Studio
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
                  <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-3 bg-foreground/[0.015]">
                    <p className="text-sm font-medium">
                      Your local vault doesn&apos;t have any saved notes yet.
                    </p>
                    <p className="text-xs opacity-65 max-w-md mx-auto">
                      Start writing in Split Studio with real-time Markdown
                      preview, zero-latency IndexedDB storage, and BYOK Gemini AI.
                    </p>
                    <Button size="sm" onClick={handleNewNote} className="mt-1">
                      <Plus className="size-3.5 mr-1.5" />
                      Create First Note
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {featuredBentoNotes.map((note, idx) => {
                      const isCurrent = selectedNoteId === note.public_id
                      return (
                        <div
                          key={`bento-${note.public_id}`}
                          onClick={() => handleSelectNote(note.public_id)}
                          className="group cursor-pointer rounded-2xl border border-border/80 p-4 bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:border-brand/50 transition-all flex flex-col justify-between min-h-[148px] shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium ${
                                  note.favorite
                                    ? "bg-brand/20 text-brand-ink"
                                    : idx === 0
                                    ? "bg-foreground/10 opacity-85"
                                    : "bg-foreground/6 opacity-70"
                                }`}
                              >
                                {note.favorite
                                  ? "★ Starred"
                                  : isCurrent
                                  ? "Active in Studio"
                                  : "Recent Draft"}
                              </span>
                              <span className="text-[10px] font-mono opacity-50">
                                {formatFileTimestamp(note.updated_at)}
                              </span>
                            </div>

                            <h3 className="font-serif font-semibold text-base leading-snug group-hover:text-brand-ink transition-colors line-clamp-1">
                              {note.title || "Untitled Note"}
                            </h3>

                            <p className="text-xs opacity-65 line-clamp-2 mt-1.5 leading-relaxed">
                              {note.snippet ||
                                "Open in Split Studio to continue writing and previewing side-by-side..."}
                            </p>
                          </div>

                          <div className="mt-4 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                            <span className="truncate max-w-[140px]">
                              {formatFileName(note.title)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-brand-ink font-medium">
                              Studio <ArrowUpRight className="size-3" />
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recent Vault Notes Editorial List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider opacity-60 font-semibold">
                    {omniboxQuery
                      ? `Matching Vault Notes (${homeRecentNotes.length})`
                      : "Recent Vault Notes"}
                  </h2>
                  <span className="text-[11px] font-mono opacity-50">
                    Click any note to open in Split Studio
                  </span>
                </div>

                {homeRecentNotes.length === 0 ? (
                  <div className="rounded-xl border border-border/60 p-6 text-center text-xs opacity-60">
                    No notes match &ldquo;{omniboxQuery}&rdquo;. Press Enter to
                    draft a new note.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/80 divide-y divide-border/60 overflow-hidden bg-foreground/[0.01]">
                    {homeRecentNotes.map((note) => (
                      <div
                        key={`recent-${note.public_id}`}
                        onClick={() => handleSelectNote(note.public_id)}
                        className="group px-4 py-3 flex items-center justify-between gap-4 hover:bg-foreground/[0.03] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/70 text-brand-ink">
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
                              <p className="text-xs font-semibold truncate group-hover:text-brand-ink transition-colors">
                                {note.title || "Untitled Note"}
                              </p>
                              {note.visibility === "public" ||
                              note.visibility === "unlisted" ? (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand/15 text-brand-ink">
                                  Shared
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] opacity-60 truncate mt-0.5">
                              {note.snippet || "Empty markdown document"}
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
                                ? "text-brand-ink opacity-100"
                                : "opacity-35 hover:opacity-100 hover:bg-foreground/8"
                            }`}
                          >
                            <Star
                              className="size-3.5"
                              fill={note.favorite ? "currentColor" : "none"}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleCopyShareLinkInline(note, e)}
                            title="Copy share link"
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-75 hover:!opacity-100 hover:bg-foreground/8 transition-all"
                          >
                            <Link2 className="size-3.5" />
                          </button>

                          <span className="text-[11px] font-mono opacity-55 w-10 text-right">
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

        {/* 3. View 2: ALL VAULT NOTES / FAVORITES DIRECTORY */}
        {activeSection === "notes" && (
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-7">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest opacity-55">
                    LOCAL VAULT DIRECTORY
                  </p>
                  <h1 className="font-serif text-2xl font-semibold tracking-tight mt-0.5">
                    {currentFilter === "favorites"
                      ? "Starred Vault Notes"
                      : "All Vault Notes"}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-foreground/[0.03] text-xs">
                    <button
                      type="button"
                      onClick={() => setCurrentFilter("notes")}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        currentFilter === "notes"
                          ? "bg-foreground text-background shadow-2xs"
                          : "opacity-65 hover:opacity-100"
                      }`}
                    >
                      All ({notes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentFilter("favorites")}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        currentFilter === "favorites"
                          ? "bg-foreground text-background shadow-2xs"
                          : "opacity-65 hover:opacity-100"
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
                <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-45" />
                <Input
                  type="text"
                  placeholder="Filter notes by title or content snippet..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-foreground/[0.02] border-border/80 text-sm"
                />
              </div>

              {/* Notes Grid */}
              {directoryNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center space-y-2">
                  <FolderOpen className="size-7 mx-auto opacity-40" />
                  <p className="text-sm font-medium">No notes found</p>
                  <p className="text-xs opacity-60">
                    {directorySearch
                      ? `No notes match "${directorySearch}".`
                      : currentFilter === "favorites"
                      ? "Star any note to pin it here for instant access."
                      : "Create your first note to populate your vault."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {directoryNotes.map((note) => (
                    <div
                      key={`dir-${note.public_id}`}
                      onClick={() => handleSelectNote(note.public_id)}
                      className="group cursor-pointer rounded-2xl border border-border/80 p-4 bg-foreground/[0.015] hover:bg-foreground/[0.04] hover:border-brand/50 transition-all flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif font-semibold text-base group-hover:text-brand-ink transition-colors line-clamp-1">
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
                                  : "opacity-40 hover:opacity-100"
                              }`}
                              title={
                                note.favorite ? "Unstar note" : "Star note"
                              }
                            >
                              <Star
                                className="size-3.5"
                                fill={note.favorite ? "currentColor" : "none"}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCopyShareLinkInline(note, e)}
                              className="p-1 rounded-md opacity-40 hover:opacity-100 transition-opacity"
                              title="Copy share link"
                            >
                              <Link2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteInline(note, e)}
                              className="p-1 rounded-md opacity-40 hover:opacity-100 hover:text-destructive transition-colors"
                              title="Move to trash"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs opacity-65 line-clamp-2 mt-1.5 leading-relaxed">
                          {note.snippet || "No additional text content."}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] font-mono opacity-60">
                        <span>Updated {formatFileTimestamp(note.updated_at)}</span>
                        <span className="text-brand-ink font-medium group-hover:underline">
                          Open in Studio →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. View 3: SPLIT STUDIO (Kept mounted so editor state is preserved seamlessly) */}
        <div
          className={
            activeSection === "studio"
              ? "flex-1 flex flex-col min-h-0 overflow-hidden"
              : "hidden"
          }
        >
          {/* Studio Sub-Toolbar */}
          <div className="px-3 sm:px-5 py-2 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 bg-foreground/[0.015] shrink-0">
            {/* Left: Back to Home Hub + Active Filename Badge */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setActiveSection("home")}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border/70 hover:bg-foreground/5 opacity-80 hover:opacity-100 transition-all"
              >
                <ArrowLeft className="size-3.5" />
                <span>Home</span>
              </button>

              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-foreground/[0.05] font-medium truncate max-w-[180px] sm:max-w-[260px]">
                {formattedDocTitle}
              </span>

              {isNewDraft && (
                <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-mono text-brand-ink font-medium">
                  Draft
                </span>
              )}
            </div>

            {/* Center: Tri-Mode Switcher (Editor only / Split Studio / Reader Card) */}
            <div className="flex items-center rounded-lg border border-border/70 bg-foreground/[0.03] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLayoutMode("editor")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  layoutMode === "editor"
                    ? "bg-foreground text-background shadow-2xs"
                    : "opacity-65 hover:opacity-100"
                }`}
              >
                <PenLine className="size-3" />
                <span>Editor only</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("split")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  layoutMode === "split"
                    ? "bg-foreground text-background shadow-2xs"
                    : "opacity-65 hover:opacity-100"
                }`}
              >
                <Columns2 className="size-3" />
                <span>Split Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("preview")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  layoutMode === "preview"
                    ? "bg-foreground text-background shadow-2xs"
                    : "opacity-65 hover:opacity-100"
                }`}
              >
                <BookOpen className="size-3" />
                <span>Reader Card</span>
              </button>
            </div>

            {/* Right: AI Assistant + Share Document */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => editorApiRef.current?.openAi()}
                className="h-7 px-2.5 text-xs gap-1.5 rounded-lg border-brand/40 bg-brand/10 text-brand-ink hover:bg-brand/20"
              >
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">AI Assistant</span>
              </Button>

              <Button
                variant="default"
                size="xs"
                onClick={() => editorApiRef.current?.openShare()}
                className="h-7 px-3 text-xs gap-1.5 rounded-lg font-medium"
              >
                <Share2 className="size-3.5" />
                <span>Share</span>
              </Button>
            </div>
          </div>

          {/* Split Panes Container */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* LEFT PANE: Markdown Editor */}
            <div
              className={
                layoutMode === "preview"
                  ? "hidden"
                  : layoutMode === "split"
                  ? "w-full lg:w-1/2 h-full flex flex-col border-r border-border/60 overflow-hidden"
                  : "w-full h-full flex flex-col overflow-hidden"
              }
            >
              <div className="px-5 py-2 border-b border-border/40 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider opacity-50 shrink-0">
                <span>Markdown Editor</span>
                <span>
                  Ln {editorStats.line}, Col {editorStats.col} ·{" "}
                  {editorStats.words}w
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div
                  className={
                    layoutMode === "split"
                      ? "px-4 py-4 md:px-7"
                      : "mx-auto max-w-3xl px-4 py-6 md:px-8"
                  }
                >
                  <NoteEditor
                    key={isNewDraft ? "new-draft" : selectedNote?.public_id ?? "empty"}
                    publicId={
                      isNewDraft ? undefined : selectedNote?.public_id
                    }
                    initialTitle={
                      isNewDraft ? "" : selectedNote?.title ?? ""
                    }
                    initialContent={
                      isNewDraft ? undefined : selectedNote?.content
                    }
                    serverUpdatedAt={
                      isNewDraft ? null : selectedNote?.updated_at
                    }
                    isAuthenticated={true}
                    embedded={true}
                    hideHeader={true}
                    editorApiRef={editorApiRef}
                    onTitleChange={handleTitleChange}
                    onNoteChange={handleNoteSaved}
                    onEditorStatsChange={setEditorStats}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT PANE: Floating Editorial Reader Card */}
            {layoutMode !== "editor" && (
              <div
                className={
                  layoutMode === "split"
                    ? "hidden lg:flex lg:w-1/2 h-full p-3 sm:p-5 overflow-y-auto bg-foreground/[0.02]"
                    : "w-full h-full p-4 sm:p-8 overflow-y-auto bg-foreground/[0.02]"
                }
              >
                <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border/80 bg-background/80 p-6 sm:p-8 shadow-sm flex flex-col h-fit min-h-full">
                  {/* Reader Card Header */}
                  <div className="flex items-center justify-between pb-4 mb-6 border-b border-border/50 text-[10px] font-mono uppercase tracking-wider opacity-65">
                    <span className="flex items-center gap-1.5 text-brand-ink font-semibold">
                      <span className="size-1.5 rounded-full bg-brand" />
                      Synchronized Live Preview
                    </span>

                    <button
                      type="button"
                      onClick={() => setReaderSerif((v) => !v)}
                      className="px-2 py-0.5 rounded border border-border/70 hover:bg-foreground/5 transition-colors"
                    >
                      Font: {readerSerif ? "Editorial Serif" : "Clean Sans"}
                    </button>
                  </div>

                  {/* Reader Card Body */}
                  <article
                    className={`prose prose-neutral dark:prose-invert max-w-none flex-1 ${
                      readerSerif ? "font-serif" : "font-sans"
                    }`}
                  >
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-5">
                      {previewTitle || "Untitled Document"}
                    </h1>

                    {editorStats.html && editorStats.html !== "<p></p>" ? (
                      <div
                        className="tiptap prose prose-neutral dark:prose-invert max-w-none leading-relaxed text-foreground/90"
                        dangerouslySetInnerHTML={{ __html: editorStats.html }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Start typing in the Markdown Editor to see your
                        synchronized editorial preview here...
                      </p>
                    )}
                  </article>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Bottom Status Bar */}
        <footer className="h-7 px-4 border-t border-border/60 flex items-center justify-between text-[11px] font-mono opacity-65 shrink-0 bg-foreground/[0.015]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand" />
              0ms local-first latency
            </span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="hidden sm:inline">AES-256-GCM Local Vault</span>
            <span className="opacity-40">•</span>
            <span>
              Words: {editorStats.words.toLocaleString()} · Chars:{" "}
              {editorStats.chars.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline">
              Ln {editorStats.line}, Col {editorStats.col} · ⌘1 Home · ⌘2 Studio
            </span>
            <span className="text-brand-ink font-semibold">Notra v2.0</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
