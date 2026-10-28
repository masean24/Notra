"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  AtSign,
  Calendar,
  CheckSquare,
  Code2,
  Download,
  FileText,
  Hash,
  History,
  LayoutTemplate,
  Link2,
  ListTree,
  Lock,
  Maximize,
  Minimize,
  MoreHorizontal,
  QrCode,
  Save,
  Share2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import type { JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NotraMark } from "@/components/brand/notra-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { AiAssistantDialog } from "@/components/ai/ai-assistant-dialog"
import { SaveShareDialog } from "@/components/notes/save-share-dialog"
import { RevisionsDialog } from "@/components/notes/revisions-dialog"
import { ShareLinksDialog } from "@/components/notes/share-links-dialog"
import { TocPanel } from "@/components/editor/toc-panel"
import { TemplatesDialog } from "@/components/editor/templates-dialog"
import { QrDialog } from "@/components/editor/qr-dialog"
import { EditorBubbleMenu } from "@/components/editor/bubble-menu"
import { FloatingLeftToolbar } from "@/components/editor/floating-left-toolbar"
import { SlashCommandMenu } from "@/components/editor/slash-command-menu"
import {
  ReadingSettingsPopover,
  type EditorFont,
  type EditorWidth,
  type ToolbarPosition,
} from "@/components/editor/reading-settings-popover"
import { WordTargetPopover } from "@/components/editor/word-target-popover"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ApiRequestError, apiFetch } from "@/lib/client/api"
import { deriveTitleFromContent } from "@/lib/notes/title"
import {
  parseImportFile,
  toJsonBackup,
  toHtml,
  toMarkdown,
  toPlainText,
  type ExportFormat,
} from "@/lib/notes/serialize"
import { clearDraft, getSetting, loadDraft, saveDraft, setSetting } from "@/lib/sync/drafts"
import { setEditorCommands } from "@/components/palette/registry"
import {
  deleteConflict,
  enqueueOp,
  getOpForNote,
  listConflicts,
  listOpsFifo,
  updateOp,
  type ConflictRow,
} from "@/lib/sync/drafts"
import {
  initSyncEngine,
  runSync,
  SYNC_EVENT_NAME,
} from "@/lib/sync/engine"

export interface EditorStats {
  words: number
  chars: number
  line: number
  col: number
  html: string
  markdown: string
  saveStatus: "syncing" | "saved" | "cloud" | "offline"
}

export interface EditorApi {
  openShare: () => void
  openAi: () => void
  exportNote: (fmt: ExportFormat) => void
  saveNow: () => void
}

export interface NoteEditorProps {
  /** Existing Tiptap JSON to load (edit mode). Absent on /new. */
  initialContent?: unknown
  /** Present when editing an already-saved note. */
  publicId?: string
  /** Initial title if known */
  initialTitle?: string
  /** Show a "lock again" action that revokes the current edit session. */
  onRevoke?: () => void
  /** Whether the visitor is signed in — owned-note saves skip edit codes. */
  isAuthenticated?: boolean
  /** Server updated_at at load time — base for offline conflict detection. */
  serverUpdatedAt?: string | null
  /** When embedded inside a split-pane dashboard */
  embedded?: boolean
  /** When true, hides the default internal top header */
  hideHeader?: boolean
  /** Notify parent when title changes */
  onTitleChange?: (title: string) => void
  /** Notify parent when note is saved/updated */
  onNoteChange?: (note: { publicId: string; title: string; content?: unknown }) => void
  /** Real-time editor stats and rendered content for Live Preview */
  onEditorStatsChange?: (stats: EditorStats) => void
  /** Ref to imperatively trigger dialogs/actions from outer frame */
  editorApiRef?: React.MutableRefObject<EditorApi | null>
  /** Optional custom left slot in header when embedded in Dashboard */
  leftHeaderSlot?: React.ReactNode
  /** Optional extra action buttons in header (e.g. Split Preview toggle) */
  extraHeaderActions?: React.ReactNode
}

const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb)
  return () => window.removeEventListener("storage", cb)
}

const getFontSnapshot = (): EditorFont => {
  if (typeof window === "undefined") return "sans"
  const saved = localStorage.getItem("notra_font")
  return (saved === "serif" || saved === "mono" ? saved : "sans") as EditorFont
}

const getWidthSnapshot = (): EditorWidth => {
  if (typeof window === "undefined") return "standard"
  const saved = localStorage.getItem("notra_width")
  return (saved === "wide" ? "wide" : "standard") as EditorWidth
}

const getToolbarPositionSnapshot = (): ToolbarPosition => {
  if (typeof window === "undefined") return "bottom"
  const saved = localStorage.getItem("notra_toolbar_pos")
  return (saved === "left" ? "left" : "bottom") as ToolbarPosition
}

const NOTE_ICONS = ["💡", "📝", "🚀", "⚡", "🎨", "📚", "🧠"]
const CATEGORY_TAGS = ["Personal", "Engineering", "Product", "Research", "Ideas"]

export function NoteEditor({
  initialContent,
  publicId,
  initialTitle = "",
  onRevoke,
  isAuthenticated = false,
  serverUpdatedAt = null,
  embedded = false,
  hideHeader = false,
  onTitleChange,
  onNoteChange,
  onEditorStatsChange,
  editorApiRef,
  leftHeaderSlot,
  extraHeaderActions,
}: NoteEditorProps) {
  const [docTitle, setDocTitle] = useState(initialTitle)
  const [, setStorageVersion] = useState(0)
  const font = useSyncExternalStore<EditorFont>(subscribeStorage, getFontSnapshot, () => "sans")
  const widthMode = useSyncExternalStore<EditorWidth>(subscribeStorage, getWidthSnapshot, () => "standard")
  const toolbarPosition = useSyncExternalStore<ToolbarPosition>(
    subscribeStorage,
    getToolbarPositionSnapshot,
    () => "bottom"
  )
  const [saveStatus, setSaveStatus] = useState<"saved" | "syncing" | "cloud" | "offline">("saved")
  const [iconIdx, setIconIdx] = useState(0)
  const [tagIdx, setTagIdx] = useState(0)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: "Press '/' for commands, or start typing...",
      }),
    ],
    content: (initialContent ?? "") as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none",
        "aria-label": "Note editor",
      },
    },
  })

  const [savedPublicId, setSavedPublicId] = useState<string | null>(
    publicId ?? null
  )
  const [savedTitle, setSavedTitle] = useState<string>(initialTitle)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [dialogSession, setDialogSession] = useState(0)
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [wordTarget, setWordTarget] = useState(0)

  const [queuedCount, setQueuedCount] = useState(0)
  const [conflicts, setConflicts] = useState<ConflictRow[]>([])
  const [reauthPending, setReauthPending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cloudAutoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestTitleRef = useRef<string>(initialTitle)

  useEffect(() => {
    latestTitleRef.current = docTitle
  }, [docTitle])

  // Update content if initialContent changes
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      editor.commands.setContent((initialContent ?? "") as JSONContent)
    }
  }, [editor, initialContent])

  // Load persisted word target, font, and width settings from IndexedDB
  useEffect(() => {
    getSetting<number>("word-target")
      .then((value) => {
        if (typeof value === "number" && value >= 0) {
          setWordTarget(value)
        }
      })
      .catch(() => {})

    getSetting<EditorFont>("notra_font")
      .then((savedFont) => {
        if (savedFont && (savedFont === "serif" || savedFont === "mono" || savedFont === "sans")) {
          localStorage.setItem("notra_font", savedFont)
          setStorageVersion((v) => v + 1)
        }
      })
      .catch(() => {})

    getSetting<EditorWidth>("notra_width")
      .then((savedWidth) => {
        if (savedWidth && (savedWidth === "wide" || savedWidth === "standard")) {
          localStorage.setItem("notra_width", savedWidth)
          setStorageVersion((v) => v + 1)
        }
      })
      .catch(() => {})

    getSetting<ToolbarPosition>("notra_toolbar_pos")
      .then((savedPos) => {
        if (savedPos && (savedPos === "bottom" || savedPos === "left")) {
          localStorage.setItem("notra_toolbar_pos", savedPos)
          setStorageVersion((v) => v + 1)
        }
      })
      .catch(() => {})
  }, [])

  function handleFontChange(nextFont: EditorFont) {
    try {
      localStorage.setItem("notra_font", nextFont)
      setSetting("notra_font", nextFont).catch(() => {})
      setStorageVersion((v) => v + 1)
    } catch {}
  }

  function handleWidthModeChange(nextWidth: EditorWidth) {
    try {
      localStorage.setItem("notra_width", nextWidth)
      setSetting("notra_width", nextWidth).catch(() => {})
      setStorageVersion((v) => v + 1)
    } catch {}
  }

  function handleToolbarPositionChange(nextPos: ToolbarPosition) {
    try {
      localStorage.setItem("notra_toolbar_pos", nextPos)
      setSetting("notra_toolbar_pos", nextPos).catch(() => {})
      setStorageVersion((v) => v + 1)
    } catch {}
  }

  function applyQuickStarter(type: "ai" | "meeting" | "todo" | "code") {
    if (!editor) return
    const starters: Record<
      "ai" | "meeting" | "todo" | "code",
      { title: string; content: JSONContent }
    > = {
      ai: {
        title: "Brainstorming: Product Launch Strategy",
        content: {
          type: "doc",
          content: [
            {
              type: "blockquote",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "AI Prompt: Outline the key phases for launching our new digital workspace.",
                    },
                  ],
                },
              ],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "1. Pre-Launch Teaser" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Build anticipation with an interactive waitlist and early-access invites for creators.",
                },
              ],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "2. Community Rollout" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Share behind-the-scenes design decisions and gather real-time feedback.",
                },
              ],
            },
          ],
        },
      },
      meeting: {
        title: "Weekly Product Sync",
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Attendees" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Design, Engineering & Product" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Key Discussion Points" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Review Q4 roadmap milestones and velocity" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Finalize UI/UX polish for the /new editor" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      todo: {
        title: "Sprint Action Items",
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Priority Tasks" }],
            },
            {
              type: "taskList",
              content: [
                {
                  type: "taskItem",
                  attrs: { checked: true },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Refine top navigation bar hierarchy" }],
                    },
                  ],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Test bottom floating formatting dock" }],
                    },
                  ],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Prepare release notes for v2.0" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      code: {
        title: "API Integration Snippet",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Example configuration for initializing the client SDK:",
                },
              ],
            },
            {
              type: "codeBlock",
              content: [
                {
                  type: "text",
                  text: 'import { NotraClient } from "@notra/sdk";\n\nconst client = new NotraClient({\n  mode: "local-first",\n  syncInterval: 2000,\n});',
                },
              ],
            },
          ],
        },
      },
    }

    const picked = starters[type]
    setDocTitle(picked.title)
    setSavedTitle(picked.title)
    onTitleChange?.(picked.title)
    editor.commands.setContent(picked.content)
    editor.commands.focus("end")
  }

  // Offline sync wiring
  const noteId = savedPublicId
  useEffect(() => {
    initSyncEngine()

    async function refreshSyncState() {
      const ops = await listOpsFifo()
      setQueuedCount(ops.length)
      setReauthPending(
        Boolean(noteId && ops.some((op) => op.needsReauth && op.publicId === noteId))
      )
      if (noteId) {
        const rows = await listConflicts()
        setConflicts(rows.filter((row) => row.publicId === noteId))
      } else {
        setConflicts([])
      }
    }

    void refreshSyncState()
    function onSyncEvent() {
      void refreshSyncState()
    }
    window.addEventListener(SYNC_EVENT_NAME, onSyncEvent)
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, onSyncEvent)
    }
  }, [noteId])

  function changeWordTarget(value: number) {
    setWordTarget(value)
    setSetting("word-target", value).catch(() => {})
  }

  const isCreateMode = !savedPublicId

  // Restore local draft in create mode
  useEffect(() => {
    if (!isCreateMode || !editor) {
      return
    }
    let cancelled = false
    loadDraft()
      .then((draft) => {
        if (!cancelled && draft?.content && editor.isEmpty) {
          editor.commands.setContent(draft.content as JSONContent)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [editor, isCreateMode])

  // Persist working draft (create mode) or auto-save to cloud (existing note mode)
  const persistDraft = useCallback(() => {
    if (!editor) {
      return
    }
    setSaveStatus("syncing")
    if (isCreateMode) {
      if (draftTimer.current) {
        clearTimeout(draftTimer.current)
      }
      const snapshot = editor.getJSON()
      draftTimer.current = setTimeout(() => {
        saveDraft(snapshot)
          .then(() => {
            setSaveStatus("saved")
          })
          .catch(() => {})
      }, 400)
      return
    }

    // Existing saved note: debounce cloud auto-save so edits are always persisted
    if (savedPublicId) {
      if (cloudAutoSaveTimer.current) {
        clearTimeout(cloudAutoSaveTimer.current)
      }
      cloudAutoSaveTimer.current = setTimeout(() => {
        const snapshot = editor.getJSON()
        const titleToSave =
          latestTitleRef.current ||
          savedTitle ||
          deriveTitleFromContent(snapshot) ||
          "Untitled note"
        apiFetch<{ revisionNo: number }>(`/api/notes/${savedPublicId}/save`, {
          method: "PUT",
          body: JSON.stringify({
            title: titleToSave,
            content: snapshot,
            contentFormat: "tiptap_json",
          }),
        })
          .then(() => {
            setSaveStatus("cloud")
            onNoteChange?.({
              publicId: savedPublicId,
              title: titleToSave,
              content: snapshot,
            })
          })
          .catch(() => {
            setSaveStatus("offline")
          })
      }, 900)
    }
  }, [editor, isCreateMode, savedPublicId, savedTitle, onNoteChange])

  useEffect(() => {
    if (!editor) {
      return
    }
    const handler = () => {
      persistDraft()
      // Automatically derive docTitle if still empty
      if (!docTitle.trim() && !savedTitle.trim()) {
        const derived = deriveTitleFromContent(editor.getJSON())
        if (derived) {
          onTitleChange?.(derived)
        }
      }
    }
    editor.on("update", handler)
    return () => {
      editor.off("update", handler)
    }
  }, [editor, persistDraft, docTitle, savedTitle, onTitleChange])

  // Word & reading statistics
  const stats = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) return { words: 0, characters: 0 }
      const text = currentEditor.getText()
      const trimmed = text.trim()
      return {
        words: trimmed ? trimmed.split(/\s+/).length : 0,
        characters: text.length,
      }
    },
  }) ?? { words: 0, characters: 0 }

  const readingMinutes =
    stats.words === 0 ? 0 : Math.max(1, Math.round(stats.words / 200))

  async function saveExisting(openShareAfter = false) {
    if (!editor || !savedPublicId) {
      return
    }
    if (cloudAutoSaveTimer.current) {
      clearTimeout(cloudAutoSaveTimer.current)
    }
    setSaving(true)
    setSaveStatus("syncing")
    const currentContent = editor.getJSON()
    const titleToSave =
      docTitle || savedTitle || deriveTitleFromContent(currentContent) || "Untitled note"
    try {
      await apiFetch<{ revisionNo: number }>(
        `/api/notes/${savedPublicId}/save`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: titleToSave,
            content: currentContent,
            contentFormat: "tiptap_json",
          }),
        }
      )
      setSaveStatus("cloud")
      toast.success("Saved to cloud.")
      onNoteChange?.({
        publicId: savedPublicId,
        title: titleToSave,
        content: currentContent,
      })
      if (openShareAfter) {
        setDialogSession((session) => session + 1)
        setSaveDialogOpen(true)
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(error.message)
      } else {
        await enqueueOp({
          kind: "save",
          publicId: savedPublicId,
          title: titleToSave,
          content: currentContent,
          contentFormat: "tiptap_json",
          baseUpdatedAt: serverUpdatedAt,
          requiresAuth: isAuthenticated,
          createdAt: Date.now(),
        })
        setSaveStatus("offline")
        toast.info("Offline — changes queued for automatic sync.")
        void runSync()
      }
    } finally {
      setSaving(false)
    }
  }

  const openSaveDialog = useCallback(
    (forceShareModal = false) => {
      if (!editor) {
        return
      }
      if (editor.isEmpty && !docTitle.trim()) {
        toast.error("Write something first — the note is still empty.")
        return
      }
      if (isCreateMode) {
        setDialogSession((session) => session + 1)
        setSaveDialogOpen(true)
        return
      }
      void saveExisting(forceShareModal)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, isCreateMode, savedPublicId, savedTitle, docTitle]
  )

  // Ctrl/Cmd+S keyboard shortcut
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        openSaveDialog()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openSaveDialog])

  // Assign stable IDs to headings for Outline
  useEffect(() => {
    if (!editor) return
    const applyIds = () => {
      const dom = editor.view.dom as HTMLElement
      const headings = dom.querySelectorAll("h1,h2,h3,h4,h5,h6")
      headings.forEach((heading, index) => {
        const slug =
          (heading.textContent ?? "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || `heading-${index + 1}`
        heading.id = `${slug}-${index + 1}`
      })
    }
    applyIds()
    editor.on("update", applyIds)
    return () => {
      editor.off("update", applyIds)
    }
  }, [editor])

  // Command palette registry
  useEffect(() => {
    if (!editor) return
    setEditorCommands([
      {
        id: "editor-bold",
        label: "Bold",
        shortcut: "Ctrl+B",
        group: "Editor",
        action: () => editor.chain().focus().toggleBold().run(),
      },
      {
        id: "editor-italic",
        label: "Italic",
        shortcut: "Ctrl+I",
        group: "Editor",
        action: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        id: "editor-underline",
        label: "Underline",
        shortcut: "Ctrl+U",
        group: "Editor",
        action: () => editor.chain().focus().toggleUnderline().run(),
      },
      {
        id: "editor-todo",
        label: "To-do list (Checklist)",
        group: "Editor",
        action: () => editor.chain().focus().toggleTaskList().run(),
      },
      {
        id: "editor-h1",
        label: "Heading 1",
        group: "Editor",
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: "editor-ai",
        label: "AI writing assistant",
        group: "Editor",
        action: () => setAiOpen(true),
      },
      {
        id: "editor-zen",
        label: "Toggle zen mode",
        group: "Editor",
        action: () => setZenMode((z) => !z),
      },
    ])
    return () => setEditorCommands([])
  }, [editor])

  // Zen mode escape listener
  useEffect(() => {
    if (!zenMode) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setZenMode(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [zenMode])

  function handleSaved(
    newPublicId: string,
    finalTitle: string,
    savedContent?: unknown
  ) {
    setSavedPublicId(newPublicId)
    setSavedTitle(finalTitle)
    setDocTitle(finalTitle)
    setSaveStatus("cloud")
    clearDraft().catch(() => {})
    onTitleChange?.(finalTitle)
    onNoteChange?.({
      publicId: newPublicId,
      title: finalTitle,
      content: savedContent ?? editor?.getJSON(),
    })
  }

  function handleExport(format: ExportFormat) {
    if (!editor) return
    const content = editor.getJSON()
    const title = docTitle || savedTitle || deriveTitleFromContent(content)
    let payload = ""
    let mime = "text/plain"
    let ext = "txt"

    if (format === "md") {
      payload = toMarkdown(content)
      mime = "text/markdown;charset=utf-8"
      ext = "md"
    } else if (format === "html") {
      payload = toHtml(content)
      mime = "text/html;charset=utf-8"
      ext = "html"
    } else if (format === "txt") {
      payload = toPlainText(content)
      mime = "text/plain;charset=utf-8"
      ext = "txt"
    } else if (format === "json") {
      payload = toJsonBackup(title, content)
      mime = "application/json;charset=utf-8"
      ext = "json"
    }

    const blob = new Blob([payload], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    const safeBase = (title || "note")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "note"
    anchor.href = url
    anchor.download = `${safeBase}.${ext}`
    anchor.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
    toast.success(`Exported as ${ext.toUpperCase()}.`)
  }

  // Populate imperative API ref for outer dashboard window frame
  useEffect(() => {
    if (editorApiRef) {
      editorApiRef.current = {
        openShare: () => openSaveDialog(true),
        openAi: () => setAiOpen(true),
        exportNote: handleExport,
        saveNow: () => openSaveDialog(false),
      }
    }
  }, [editorApiRef, openSaveDialog])

  // Real-time editor stats and rendered content for Live Preview pane
  useEffect(() => {
    if (!editor || !onEditorStatsChange) return

    const report = () => {
      const text = editor.getText()
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
      const chars = text.length
      const { from } = editor.state.selection
      const textBefore = editor.state.doc.textBetween(0, from, "\n")
      const lines = textBefore.split("\n")
      const line = lines.length
      const col = (lines[lines.length - 1] ?? "").length + 1
      const html = editor.getHTML()
      const json = editor.getJSON()
      const markdown = toMarkdown(json)

      onEditorStatsChange({
        words,
        chars,
        line,
        col,
        html,
        markdown,
        saveStatus,
      })
    }

    report()
    editor.on("update", report)
    editor.on("selectionUpdate", report)
    return () => {
      editor.off("update", report)
      editor.off("selectionUpdate", report)
    }
  }, [editor, onEditorStatsChange, saveStatus])

  async function handleImportFile(file: File) {
    if (!editor) return
    if (file.size > 2_000_000) {
      toast.error("Import files are limited to 2 MB.")
      return
    }
    try {
      const text = await file.text()
      const imported = parseImportFile(file.name, text)
      editor.commands.setContent((imported.content ?? "") as JSONContent)
      if (imported.title) {
        setDocTitle(imported.title)
        setSavedTitle(imported.title)
        onTitleChange?.(imported.title)
      }
      toast.success(`Imported ${file.name}. Review the content, then save to keep it.`)
    } catch (error) {
      if (error instanceof Error && error.message === "IMPORT_INVALID_JSON") {
        toast.error("That JSON file is not a valid Notra backup.")
      } else {
        toast.error("Could not import that file.")
      }
    }
  }

  const shareUrl =
    savedPublicId && typeof window !== "undefined"
      ? `${window.location.origin}/n/${savedPublicId}`
      : ""

  async function retryAfterUnlock() {
    if (!savedPublicId) return
    const op = await getOpForNote(savedPublicId)
    if (op?.id) {
      await updateOp(op.id, { needsReauth: false })
    }
    setReauthPending(false)
    void runSync()
  }

  async function keepMyVersion(conflict: ConflictRow) {
    if (!editor || !savedPublicId || !conflict.id) return
    setSaving(true)
    try {
      await apiFetch(`/api/notes/${savedPublicId}/save`, {
        method: "PUT",
        body: JSON.stringify({
          title: conflict.title,
          content: conflict.content,
          contentFormat: conflict.contentFormat,
        }),
      })
      await deleteConflict(conflict.id)
      editor.commands.setContent((conflict.content ?? "") as JSONContent)
      toast.success("Your version was saved on top of the server copy.")
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "Could not save your version."
      )
    } finally {
      setSaving(false)
    }
  }

  async function applyServerVersion(conflict: ConflictRow) {
    if (!editor || !savedPublicId || !conflict.id) return
    try {
      const data = await apiFetch<{ content: unknown; title: string }>(
        `/api/notes/${savedPublicId}`
      )
      editor.commands.setContent((data.content ?? "") as JSONContent)
      setSavedTitle(data.title)
      setDocTitle(data.title)
      await deleteConflict(conflict.id)
      toast.success("Loaded the server version — your offline copy was discarded.")
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "Could not load the server version."
      )
    }
  }

  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false

  return (
    <div
      className={`relative flex flex-1 flex-col bg-background ${
        embedded ? "min-h-0 h-full" : "min-h-svh"
      }`}
    >
      {/* Subtle Top Ambient Glow */}
      {!embedded ? (
        <div
          className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-brand/5 blur-[110px] rounded-full -z-10"
          aria-hidden
        />
      ) : null}

      {/* Offline / sync banners */}
      {conflicts.length > 0 || reauthPending || queuedCount > 0 ? (
        <div className="mx-auto w-full max-w-3xl px-4 pt-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              role="status"
              className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            >
              <p className="font-medium">The server copy changed while you were offline.</p>
              <p className="mb-2 text-muted-foreground">
                Keep your offline version, or load the server version instead?
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={saving} onClick={() => void keepMyVersion(conflict)}>
                  Keep mine
                </Button>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => void applyServerVersion(conflict)}>
                  Use server
                </Button>
              </div>
            </div>
          ))}
          {reauthPending ? (
            <div
              role="status"
              className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            >
              <p className="font-medium">Your editing session expired while offline.</p>
              <p className="mb-2 text-muted-foreground">
                Your changes are safe. Re-enter the edit code, then resume the sync.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" render={<Link href={`/n/${savedPublicId ?? ""}`} />}>
                  Re-enter edit code
                </Button>
                <Button variant="outline" size="sm" onClick={() => void retryAfterUnlock()}>
                  Retry after unlocking
                </Button>
              </div>
            </div>
          ) : null}
          {queuedCount > 0 && isOffline ? (
            <div
              role="status"
              className="mb-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground"
            >
              Offline — {queuedCount} queued change{queuedCount === 1 ? "" : "s"} will sync
              automatically when you reconnect.
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Top Navigation Bar */}
      {!zenMode && !hideHeader ? (
        <header className="sticky top-0 z-40 h-14 flex items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 sm:px-6 backdrop-blur-xl transition-all shrink-0">
          {/* Left: Brand & Document Context */}
          <div className="flex items-center gap-2.5 min-w-0">
            {leftHeaderSlot ? (
              leftHeaderSlot
            ) : (
              <>
                {isAuthenticated && !embedded ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft className="size-3.5" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                ) : null}

                {!embedded ? (
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-semibold shrink-0 group"
                    aria-label="Notra home"
                  >
                    <NotraMark className="size-6 transition-transform group-hover:scale-105" />
                    <span className="hidden sm:inline font-bold tracking-tight">Notra</span>
                    <span className="hidden md:inline rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border/60">
                      v2.0
                    </span>
                  </Link>
                ) : null}

                {!embedded ? (
                  <span className="hidden md:inline text-muted-foreground/35 font-mono text-xs">/</span>
                ) : null}
              </>
            )}

            {/* Clickable Document Title Breadcrumb */}
            <button
              type="button"
              onClick={() => titleInputRef.current?.focus()}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors max-w-[160px] lg:max-w-[220px] truncate"
              title="Click to rename document"
            >
              <span className="truncate">{docTitle?.trim() || "Untitled Note"}</span>
            </button>

            {/* Real-time Save Status Pill */}
            <div
              className="flex items-center gap-1.5 rounded-full bg-card/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shrink-0 border border-border/70 shadow-2xs"
              title="All changes synced"
            >
              <span
                className={`size-1.5 rounded-full shrink-0 ${
                  saveStatus === "syncing"
                    ? "bg-amber-400 animate-ping"
                    : saveStatus === "offline"
                    ? "bg-amber-500"
                    : "bg-brand ring-2 ring-brand/25"
                }`}
              />
              <span>
                {saveStatus === "syncing"
                  ? "Syncing…"
                  : saveStatus === "offline"
                  ? "Offline"
                  : saveStatus === "cloud"
                  ? "Saved to cloud"
                  : "Saved"}
              </span>
            </div>
          </div>

          {/* Right: Grouped Actions & Primary CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {extraHeaderActions}

            {/* Segmented Utility Group (AI, Templates, Zen) */}
            <div className="hidden md:flex items-center rounded-xl border border-border/80 bg-card/80 p-1">
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-ink hover:bg-brand/15 transition-all"
              >
                <Sparkles className="size-3.5" />
                <span>AI</span>
              </button>

              <div className="mx-0.5 h-3.5 w-px bg-border/80" />

              <button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all"
              >
                <LayoutTemplate className="size-3.5" />
                <span>Templates</span>
              </button>

              <div className="mx-0.5 h-3.5 w-px bg-border/80" />

              <button
                type="button"
                onClick={() => setZenMode(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all"
                title="Distraction-free Zen Mode"
              >
                <Maximize className="size-3.5" />
                <span>Zen</span>
              </button>
            </div>

            {/* Quick Theme Toggle */}
            <ThemeToggle className="size-8 rounded-lg border border-border/80 bg-card/70 text-muted-foreground hover:text-foreground" />

            {/* Appearance & Layout Popover */}
            <div className="hidden sm:block">
              <ReadingSettingsPopover
                font={font}
                onFontChange={handleFontChange}
                widthMode={widthMode}
                onWidthModeChange={handleWidthModeChange}
                toolbarPosition={toolbarPosition}
                onToolbarPositionChange={handleToolbarPositionChange}
              />
            </div>

            {/* More Actions dropdown menu (preserves all secondary tools) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-8 rounded-lg bg-card/70 border-border/80 text-muted-foreground hover:text-foreground"
                    aria-label="More actions"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {/* Mobile-only secondary quick actions */}
                <div className="md:hidden">
                  <DropdownMenuItem onClick={() => setAiOpen(true)}>
                    <Sparkles className="size-4 mr-2 text-brand-ink" />
                    <span>AI Assistant</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTemplatesOpen(true)}>
                    <LayoutTemplate className="size-4 mr-2 text-muted-foreground" />
                    <span>Templates</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setZenMode(true)}>
                    <Maximize className="size-4 mr-2 text-muted-foreground" />
                    <span>Zen Mode</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>

                <DropdownMenuItem onClick={() => setTocOpen(true)}>
                  <ListTree className="size-4 mr-2 text-muted-foreground" />
                  <span>Table of Contents</span>
                </DropdownMenuItem>

                {savedPublicId ? (
                  <>
                    <DropdownMenuItem onClick={() => setShareOpen(true)}>
                      <Link2 className="size-4 mr-2 text-muted-foreground" />
                      <span>Share Links</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setQrOpen(true)}>
                      <QrCode className="size-4 mr-2 text-muted-foreground" />
                      <span>QR Code</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                      <History className="size-4 mr-2 text-muted-foreground" />
                      <span>Version History</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={<Link href={`/notes/${savedPublicId}/seo`} />}
                    >
                      <AtSign className="size-4 mr-2 text-muted-foreground" />
                      <span>Vanity Slug &amp; SEO</span>
                    </DropdownMenuItem>
                  </>
                ) : null}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setExportOpen(true)}>
                  <Download className="size-4 mr-2 text-muted-foreground" />
                  <span>Export Document</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="size-4 mr-2 text-muted-foreground" />
                  <span>Import File</span>
                </DropdownMenuItem>

                {onRevoke ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onRevoke} className="text-destructive">
                      <Lock className="size-4 mr-2" />
                      <span>Lock again</span>
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Primary Save & Share CTA Button */}
            {!isCreateMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSaveDialog(false)}
                disabled={saving}
                className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium hidden sm:inline-flex"
              >
                <Save className="size-3.5" />
                <span>{saving ? "Saving…" : "Save"}</span>
              </Button>
            ) : null}

            <Button
              size="sm"
              onClick={() => openSaveDialog(true)}
              disabled={saving}
              className="h-8 gap-1.5 rounded-lg px-3.5 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              <Share2 className="size-3.5" />
              <span>{saving ? "Saving…" : isCreateMode ? "Save & Share" : "Share"}</span>
            </Button>
          </div>
        </header>
      ) : null}

      {/* Floating Exit Zen Button (Only visible in Zen Mode) */}
      {zenMode ? (
        <button
          type="button"
          onClick={() => setZenMode(false)}
          className="fixed top-4 right-6 z-50 flex items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground shadow-xl backdrop-blur-md transition-all"
        >
          <Minimize className="size-3.5" />
          <span>Exit Zen</span>
        </button>
      ) : null}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleImportFile(file)
          }
          event.target.value = ""
        }}
      />

      {/* Main Workspace Area */}
      <div
        className={`relative mx-auto flex w-full flex-1 flex-col items-center transition-all duration-300 ${
          embedded
            ? "px-4 sm:px-6 pt-6 pb-20 overflow-y-auto"
            : "px-4 sm:px-6 pt-8 pb-32"
        } ${
          font === "serif"
            ? "font-serif-editor"
            : font === "mono"
            ? "font-mono-editor"
            : "font-sans-editor"
        }`}
      >
        {/* Elevated Document Sheet (Unified across /new and /dashboard) */}
        <div
          className={`w-full transition-all duration-300 rounded-2xl bg-card border border-border/80 shadow-lg px-6 sm:px-12 py-8 sm:py-12 ${
            widthMode === "wide" ? "max-w-5xl" : "max-w-3xl"
          }`}
        >
          {/* Document Header / Metadata Row */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {/* Interactive Note Icon & Category Tag */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIconIdx((prev) => (prev + 1) % NOTE_ICONS.length)}
                className="group flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                title="Click to cycle note icon"
              >
                <span className="text-sm">{NOTE_ICONS[iconIdx]}</span>
                <span>Change Icon</span>
              </button>

              <button
                type="button"
                onClick={() => setTagIdx((prev) => (prev + 1) % CATEGORY_TAGS.length)}
                className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                title="Click to switch category tag"
              >
                <Hash className="size-3 text-brand-ink" />
                <span>{CATEGORY_TAGS[tagIdx]}</span>
              </button>
            </div>

            {/* Date & Reading Time */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Calendar className="size-3.5" />
              <span>Today</span>
              <span>•</span>
              <span>~{Math.max(1, readingMinutes)} min read</span>
            </div>
          </div>

          {/* Document Title Input */}
          <div className="mb-6">
            <input
              ref={titleInputRef}
              id="note-title"
              type="text"
              placeholder="Untitled Note"
              value={docTitle}
              onChange={(e) => {
                const next = e.target.value
                setDocTitle(next)
                setSavedTitle(next)
                onTitleChange?.(next)
                persistDraft()
              }}
              className="w-full bg-transparent text-3xl sm:text-4xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/35 outline-none border-none"
              aria-label="Document Title"
            />
          </div>

          {/* Bubble Menu on text selection */}
          {editor ? <EditorBubbleMenu editor={editor} /> : null}

          {/* Slash Command popover */}
          {editor ? (
            <SlashCommandMenu
              editor={editor}
              onOpenTemplates={() => setTemplatesOpen(true)}
              onOpenAi={() => setAiOpen(true)}
            />
          ) : null}

          {/* Rich Text Editor Content */}
          <EditorContent
            editor={editor}
            className="min-h-[340px] pb-6"
          />

          {/* Subtle Empty-State Quick-Starters (Auto-hides as soon as user types) */}
          {stats.words === 0 ? (
            <div className="mt-8 border-t border-border/60 pt-6 transition-opacity duration-200">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Quick start with
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyQuickStarter("ai")}
                  className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-medium text-brand-ink hover:bg-brand/20 transition-all"
                >
                  <Wand2 className="size-3.5 text-brand-ink" />
                  <span>Brainstorm with AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickStarter("meeting")}
                  className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <FileText className="size-3.5 text-muted-foreground" />
                  <span>Meeting Notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickStarter("todo")}
                  className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <CheckSquare className="size-3.5 text-muted-foreground" />
                  <span>Action Checklist</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickStarter("code")}
                  className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <Code2 className="size-3.5 text-muted-foreground" />
                  <span>Code Snippet</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Floating Formatting Toolbar (Bottom Dock or Left Rail) */}
        {!zenMode ? (
          <FloatingLeftToolbar
            editor={editor}
            onOpenAi={() => setAiOpen(true)}
            position={toolbarPosition}
            embedded={embedded}
          />
        ) : null}
      </div>

      {/* Bottom Left: Shortcuts & Brand Quick Button */}
      {!embedded && !zenMode ? (
        <div className="fixed bottom-5 left-5 z-20 hidden sm:block">
          <button
            type="button"
            onClick={() =>
              toast("Keyboard Shortcuts", {
                description:
                  "Ctrl+K Command Palette • Ctrl+B Bold • Ctrl+I Italic • Ctrl+S Save & Share",
              })
            }
            className="flex size-9 items-center justify-center rounded-full border border-border/80 bg-card/85 text-muted-foreground hover:text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105"
            title="Keyboard Shortcuts"
            aria-label="Keyboard Shortcuts"
          >
            <NotraMark className="size-4.5" />
          </button>
        </div>
      ) : null}

      {/* Bottom Right: Floating Word & Character Counter Pill */}
      {!zenMode ? (
        <div
          className={
            embedded
              ? "fixed bottom-10 right-6 z-20 hidden sm:block"
              : "fixed bottom-5 right-5 z-20 hidden sm:block"
          }
        >
          <WordTargetPopover
            words={stats.words}
            characters={stats.characters}
            readingMinutes={readingMinutes}
            wordTarget={wordTarget}
            onWordTargetChange={changeWordTarget}
          />
        </div>
      ) : null}

      {/* Responsive Outline Panel (Fixed on desktop, slide-over drawer on tablet/mobile) */}
      {tocOpen && !zenMode ? (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden"
            onClick={() => setTocOpen(false)}
          />
          <aside
            aria-label="Document outline"
            className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l bg-card p-4 shadow-2xl transition-transform lg:top-14 lg:z-40 lg:max-h-[calc(100svh-6rem)] lg:rounded-l-xl lg:border lg:shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <ListTree className="size-4" />
                <span>Outline</span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setTocOpen(false)}
                className="size-6 rounded-md"
              >
                <X className="size-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TocPanel
                content={editor?.getJSON() ?? null}
                onJump={(domIndex) => {
                  const headings = editor?.view.dom.querySelectorAll(
                    "h1,h2,h3,h4,h5,h6"
                  )
                  headings?.[domIndex]?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                  if (window.innerWidth < 1024) {
                    setTocOpen(false)
                  }
                }}
                onCopyAnchor={(heading) => {
                  const headings = editor?.view.dom.querySelectorAll(
                    "h1,h2,h3,h4,h5,h6"
                  )
                  const target = headings?.[heading.domIndex]
                  const anchor = target?.id || `heading-${heading.domIndex + 1}`
                  void navigator.clipboard.writeText(
                    `${window.location.origin}${window.location.pathname}#${anchor}`
                  )
                  toast.success("Heading link copied.")
                }}
              />
            </div>
          </aside>
        </>
      ) : null}

      {/* Modals & Dialogs */}
      <SaveShareDialog
        key={dialogSession}
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        content={editor?.getJSON() ?? null}
        getContent={() => editor?.getJSON() ?? null}
        existingPublicId={savedPublicId}
        suggestedTitle={
          docTitle || (editor ? deriveTitleFromContent(editor.getJSON()) : "")
        }
        onSaved={handleSaved}
        isAuthenticated={isAuthenticated}
      />

      {savedPublicId ? (
        <RevisionsDialog
          publicId={savedPublicId}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          currentText={editor?.getText() ?? ""}
          onRestored={(content) => {
            editor?.commands.setContent((content ?? "") as JSONContent)
          }}
        />
      ) : null}

      {savedPublicId ? (
        <ShareLinksDialog
          publicId={savedPublicId}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      ) : null}

      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onApply={(template) => {
          editor?.commands.setContent(template.content as JSONContent)
          setDocTitle(template.name)
          setSavedTitle(template.name)
          onTitleChange?.(template.name)
          toast.success(`Template applied: ${template.name}.`)
        }}
      />

      <QrDialog open={qrOpen} onOpenChange={setQrOpen} url={shareUrl} />

      <AiAssistantDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        isAuthenticated={isAuthenticated}
        contextText={editor?.getText() ?? ""}
        onInsert={(text) => {
          editor?.chain().focus().insertContent(text).run()
        }}
      />

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export note</DialogTitle>
            <DialogDescription>
              Download your note in markdown, HTML, plain text, or complete JSON backup.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("md")}
            >
              Markdown (.md)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("html")}
            >
              HTML (.html)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("txt")}
            >
              Plain text (.txt)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
            >
              JSON backup (.json)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
