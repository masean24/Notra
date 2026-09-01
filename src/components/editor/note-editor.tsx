"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Lock,
  NotebookPen,
  Quote,
  Redo2,
  Save,
  Strikethrough,
  Undo2,
} from "lucide-react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import type { JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { SaveShareDialog } from "@/components/notes/save-share-dialog"
import { ApiRequestError, apiFetch } from "@/lib/client/api"
import { deriveTitleFromContent } from "@/lib/notes/title"
import { clearDraft, loadDraft, saveDraft } from "@/lib/sync/drafts"

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
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function handleSaved(newPublicId: string, title: string) {
    setSavedPublicId(newPublicId)
    setSavedTitle(title)
    clearDraft().catch(() => {})
    toast.success("Note saved.")
  }

  return (
    <div className="flex min-h-svh flex-col">
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

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div
          role="toolbar"
          aria-label="Formatting"
          className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1"
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

        <EditorContent editor={editor} className="flex-1" />
      </div>

      <SaveShareDialog
        key={dialogSession}
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        content={editor?.getJSON() ?? null}
        suggestedTitle={
          editor ? deriveTitleFromContent(editor.getJSON()) : ""
        }
        onSaved={handleSaved}
      />
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
