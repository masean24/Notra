"use client"

import Link from "next/link"
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  NotebookPen,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

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

/**
 * Phase 1 base editor: mounts Tiptap with core prose formatting.
 * Saving to Supabase is intentionally NOT wired up yet (Phase 2).
 */
export function NoteEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap",
        "aria-label": "Note editor",
      },
    },
  })

  // useEditorState subscribes to the transactions that affect the toolbar's
  // active states and the live counts.
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
          <p
            className="text-xs text-muted-foreground"
            aria-live="polite"
          >
            {toolbar.words} words · {toolbar.characters} characters
          </p>
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
