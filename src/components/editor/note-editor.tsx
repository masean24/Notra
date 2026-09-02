"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Bold,
  Code,
  Download,
  Heading1,
  Heading2,
  Heading3,
  History,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTree,
  Lock,
  Maximize,
  Minimize,
  NotebookPen,
  LayoutTemplate,
  Quote,
  QrCode,
  Redo2,
  Save,
  Strikethrough,
  Target,
  Undo2,
  Upload,
} from "lucide-react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import type { JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { SaveShareDialog } from "@/components/notes/save-share-dialog"
import { RevisionsDialog } from "@/components/notes/revisions-dialog"
import { ShareLinksDialog } from "@/components/notes/share-links-dialog"
import { TocPanel } from "@/components/editor/toc-panel"
import { TemplatesDialog } from "@/components/editor/templates-dialog"
import { QrDialog } from "@/components/editor/qr-dialog"
import { EditorBubbleMenu } from "@/components/editor/bubble-menu"
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

/** When the editor has not mounted yet (SSR / first render), use these. */
const IDLE_TOOLBAR_STATE = {
  canUndo: false,
  canRedo: false,
  bold: false,
  italic: false,
  strike: false,
  code: false,
  h1: false,
  h2: false,
  h3: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  codeBlock: false,
  words: 0,
  characters: 0,
}

type ToolbarState = typeof IDLE_TOOLBAR_STATE

export interface NoteEditorProps {
  /** Existing Tiptap JSON to load (edit mode). Absent on /new. */
  initialContent?: unknown
  /** Present when editing an already-saved note. */
  publicId?: string
  /** Show a "lock again" action that revokes the current edit session. */
  onRevoke?: () => void
  /** Whether the visitor is signed in — owned-note saves skip edit codes. */
  isAuthenticated?: boolean
}

/**
 * The note editor. On /new it persists the working draft to IndexedDB
 * (Dexie) so content survives refresh; after the first save it issues
 * incremental saves against the created note.
 */
export function NoteEditor({
  initialContent,
  publicId,
  onRevoke,
  isAuthenticated = false,
}: NoteEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap",
        "aria-label": "Note editor",
      },
    },
  })

  const [savedPublicId, setSavedPublicId] = useState<string | null>(
    publicId ?? null
  )
  const [savedTitle, setSavedTitle] = useState<string>("")
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  // Bumped each time the dialog opens so it remounts with fresh state.
  const [dialogSession, setDialogSession] = useState(0)
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  // Word target (SPEC §6): 0 = no goal. Persisted in IndexedDB.
  const [wordTarget, setWordTarget] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the persisted word target once.
  useEffect(() => {
    getSetting<number>("word-target")
      .then((value) => {
        if (typeof value === "number" && value >= 0) {
          setWordTarget(value)
        }
      })
      .catch(() => {})
  }, [])

  function changeWordTarget(value: number) {
    setWordTarget(value)
    setSetting("word-target", value).catch(() => {})
  }

  const isCreateMode = !savedPublicId

  // Restore the local draft once, only in create mode.
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
      .catch(() => {
        // IndexedDB unavailable (private mode etc.) — drafting just stays
        // in-memory; never block writing.
      })
    return () => {
      cancelled = true
    }
  }, [editor, isCreateMode])

  const persistDraft = useCallback(() => {
    if (!editor || !isCreateMode) {
      return
    }
    if (draftTimer.current) {
      clearTimeout(draftTimer.current)
    }
    const snapshot = editor.getJSON()
    draftTimer.current = setTimeout(() => {
      saveDraft(snapshot).catch(() => {})
    }, 400)
  }, [editor, isCreateMode])

  // Subscribe the draft persistence to editor updates.
  useEffect(() => {
    if (!editor) {
      return
    }
    const handler = () => persistDraft()
    editor.on("update", handler)
    return () => {
      editor.off("update", handler)
    }
  }, [editor, persistDraft])

  const toolbar: ToolbarState =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }): ToolbarState => {
        if (!currentEditor) {
          return IDLE_TOOLBAR_STATE
        }
        const text = currentEditor.getText()
        const trimmed = text.trim()
        return {
          canUndo: currentEditor.can().undo(),
          canRedo: currentEditor.can().redo(),
          bold: currentEditor.isActive("bold"),
          italic: currentEditor.isActive("italic"),
          strike: currentEditor.isActive("strike"),
          code: currentEditor.isActive("code"),
          h1: currentEditor.isActive("heading", { level: 1 }),
          h2: currentEditor.isActive("heading", { level: 2 }),
          h3: currentEditor.isActive("heading", { level: 3 }),
          bulletList: currentEditor.isActive("bulletList"),
          orderedList: currentEditor.isActive("orderedList"),
          blockquote: currentEditor.isActive("blockquote"),
          codeBlock: currentEditor.isActive("codeBlock"),
          words: trimmed ? trimmed.split(/\s+/).length : 0,
          characters: text.length,
        }
      },
    }) ?? IDLE_TOOLBAR_STATE

  async function saveExisting() {
    if (!editor || !savedPublicId) {
      return
    }
    setSaving(true)
    try {
      await apiFetch<{ revisionNo: number }>(
        `/api/notes/${savedPublicId}/save`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: savedTitle || deriveTitleFromContent(editor.getJSON()),
            content: editor.getJSON(),
            contentFormat: "tiptap_json",
          }),
        }
      )
      toast.success("Saved.")
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(error.message)
      } else {
        toast.error("Could not save. You may be offline — try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  const openSaveDialog = useCallback(() => {
    if (!editor) {
      return
    }
    if (editor.isEmpty) {
      toast.error("Write something first — the note is still empty.")
      return
    }
    if (isCreateMode) {
      setDialogSession((session) => session + 1)
      setSaveDialogOpen(true)
      return
    }
    // Editing an existing note: save directly.
    void saveExisting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, isCreateMode, savedPublicId, savedTitle])

  // Ctrl/Cmd+S opens the save flow without hijacking reserved browser
  // shortcuts (Ctrl+N/W/T are left untouched).
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

  // Assign stable ids to headings so the outline's anchor links work.
  useEffect(() => {
    if (!editor) {
      return
    }
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

  // Zen mode exits on Esc (SPEC §6).
  useEffect(() => {
    if (!zenMode) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setZenMode(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [zenMode])

  function handleSaved(newPublicId: string, title: string) {
    setSavedPublicId(newPublicId)
    setSavedTitle(title)
    clearDraft().catch(() => {})
    toast.success("Note saved.")
  }

  const currentTitle = savedTitle || (editor ? deriveTitleFromContent(editor.getJSON()) : "")

  function doExport(format: ExportFormat) {
    if (!editor) {
      return
    }
    const doc = editor.getJSON()
    let body: string
    let mime: string
    switch (format) {
      case "txt":
        body = toPlainText(doc)
        mime = "text/plain;charset=utf-8"
        break
      case "md":
        body = toMarkdown(doc)
        mime = "text/markdown;charset=utf-8"
        break
      case "html":
        body = `<!doctype html><meta charset="utf-8"><title>${currentTitle || "Untitled note"}</title>${toHtml(doc)}`
        mime = "text/html;charset=utf-8"
        break
      case "json":
        body = toJsonBackup(currentTitle, doc)
        mime = "application/json"
        break
    }
    const blob = new Blob([body], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${(currentTitle || "untitled").replace(/[^\w-]+/g, "-").toLowerCase()}.${format}`
    anchor.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
    toast.success(`Exported as .${format}.`)
  }

  async function handleImportFile(file: File) {
    if (!editor) {
      return
    }
    if (file.size > 2_000_000) {
      toast.error("Import files are limited to 2 MB.")
      return
    }
    try {
      const text = await file.text()
      const imported = parseImportFile(file.name, text)
      editor.commands.setContent((imported.content ?? "") as JSONContent)
      if (imported.title && !isCreateMode) {
        setSavedTitle(imported.title)
      }
      toast.success(
        `Imported ${file.name}. Review the content, then save to keep it.`
      )
    } catch (error) {
      if (error instanceof Error && error.message === "IMPORT_INVALID_JSON") {
        toast.error(
          "That JSON file is not a valid OpenNotepad backup. Expected .md, .txt, or an exported .json."
        )
      } else {
        toast.error("Could not import that file.")
      }
    }
  }

  const shareUrl =
    savedPublicId && typeof window !== "undefined"
      ? `${window.location.origin}/n/${savedPublicId}`
      : ""

  const readingMinutes =
    toolbar.words === 0 ? 0 : Math.max(1, Math.round(toolbar.words / 200))
  const targetProgress =
    wordTarget > 0 ? Math.min(100, Math.round((toolbar.words / wordTarget) * 100)) : 0

  return (
    <div className="flex min-h-svh flex-col">
      {!zenMode ? (
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
          aria-label="OpenNotepad home"
        >
          <NotebookPen className="size-4" aria-hidden />
          OpenNotepad
        </Link>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {toolbar.words} words · {toolbar.characters} characters
          </p>
          {savedPublicId ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="size-4" aria-hidden />
                History
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShareOpen(true)}
              >
                <Link2 className="size-4" aria-hidden />
                Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!shareUrl}
                aria-label="Show QR code"
                onClick={() => setQrOpen(true)}
              >
                <QrCode className="size-4" aria-hidden />
                QR
              </Button>
            </>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTocOpen((open) => !open)}
            aria-pressed={tocOpen}
          >
            <ListTree className="size-4" aria-hidden />
            Outline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTemplatesOpen(true)}
          >
            <LayoutTemplate className="size-4" aria-hidden />
            Templates
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Enter zen mode"
            onClick={() => setZenMode(true)}
          >
            <Maximize className="size-4" aria-hidden />
            Zen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportOpen(true)}
          >
            <Download className="size-4" aria-hidden />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            Import
          </Button>
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
          {onRevoke ? (
            <Button variant="ghost" size="sm" onClick={onRevoke}>
              <Lock className="size-4" aria-hidden />
              Lock again
            </Button>
          ) : null}
          <Button size="sm" onClick={openSaveDialog} disabled={saving}>
            <Save className="size-4" aria-hidden />
            {saving ? "Saving…" : isCreateMode ? "Save & Share" : "Save"}
          </Button>
          <ThemeToggle />
        </div>
      </header>
      ) : null}

      {!zenMode ? (
      <div
        role="toolbar"
        aria-label="Formatting"
        className="mx-auto mb-4 mt-4 flex w-full max-w-3xl flex-wrap items-center gap-1 rounded-lg border bg-card p-1 px-4"
      >
          <ToolbarButton
            label="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!toolbar.canUndo}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!toolbar.canRedo}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            label="Heading 1"
            active={toolbar.h1}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 2"
            active={toolbar.h2}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 3"
            active={toolbar.h3}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="size-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            label="Bold"
            active={toolbar.bold}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={toolbar.italic}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            active={toolbar.strike}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Inline code"
            active={toolbar.code}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            <Code className="size-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            label="Bullet list"
            active={toolbar.bulletList}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={toolbar.orderedList}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Blockquote"
            active={toolbar.blockquote}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Code block"
            active={toolbar.codeBlock}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="size-4 rotate-90" />
          </ToolbarButton>
        </div>
        ) : null}

        <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
          {editor ? <EditorBubbleMenu editor={editor} /> : null}
          <EditorContent editor={editor} className="flex-1" />

          {/* Word target + reading time (SPEC §6) */}
          <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t bg-background/80 py-2 text-xs text-muted-foreground backdrop-blur-md">
            <p className="flex items-center gap-1.5" aria-live="polite">
              <Target className="size-3.5" aria-hidden />
              {toolbar.words} words
              {readingMinutes > 0 ? ` · ~${readingMinutes} min read` : ""}
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="word-target" className="text-xs">
                Target
              </Label>
              <Input
                id="word-target"
                type="number"
                min={0}
                max={500000}
                value={wordTarget}
                onChange={(event) =>
                  changeWordTarget(
                    Math.max(0, Math.min(500000, Number(event.target.value) || 0))
                  )
                }
                className="h-6 w-20 text-xs"
              />
            </div>
            {wordTarget > 0 ? (
              <div
                className="flex min-w-40 flex-1 items-center gap-2"
                role="progressbar"
                aria-valuenow={targetProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward word target"
              >
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${targetProgress}%` }}
                  />
                </div>
                <span>{targetProgress}%</span>
              </div>
            ) : null}
            {zenMode ? (
              <Button
                variant="ghost"
                size="xs"
                className="ml-auto"
                onClick={() => setZenMode(false)}
              >
                <Minimize className="size-3.5" aria-hidden />
                Exit zen (Esc)
              </Button>
            ) : null}
          </div>
        </div>

      {/* Outline / TOC sidebar (SPEC §6) */}
      {tocOpen && !zenMode ? (
        <aside
          aria-label="Document outline"
          className="fixed right-0 top-14 z-10 hidden max-h-[calc(100svh-6rem)] w-64 overflow-y-auto rounded-l-xl border bg-card shadow-lg lg:block"
        >
          <TocPanel
            content={editor?.getJSON() ?? null}
            onJump={(domIndex) => {
              const headings = editor?.view.dom.querySelectorAll(
                "h1,h2,h3,h4,h5,h6"
              )
              headings?.[domIndex]?.scrollIntoView({ behavior: "smooth", block: "start" })
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
        </aside>
      ) : null}

      <SaveShareDialog
        key={dialogSession}
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        content={editor?.getJSON() ?? null}
        suggestedTitle={
          editor ? deriveTitleFromContent(editor.getJSON()) : ""
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
          if (!isCreateMode) {
            setSavedTitle(template.name)
          }
          toast.success(`Template applied: ${template.name}.`)
        }}
      />

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={shareUrl}
      />

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export note</DialogTitle>
            <DialogDescription>
              Download the current content. JSON includes the full structured
              backup and can be re-imported later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => doExport("txt")}>
              Plain text (.txt)
            </Button>
            <Button variant="outline" onClick={() => doExport("md")}>
              Markdown (.md)
            </Button>
            <Button variant="outline" onClick={() => doExport("html")}>
              Web page (.html)
            </Button>
            <Button variant="outline" onClick={() => doExport("json")}>
              Backup (.json)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={active ? "bg-muted text-foreground" : undefined}
    >
      {children}
    </Button>
  )
}
