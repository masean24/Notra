"use client"

import { useState } from "react"
import type { Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Code,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code2,
  Minus,
  Wand2,
  Undo2,
  Redo2,
  RemoveFormatting,
  ChevronDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import type { ToolbarPosition } from "@/components/editor/reading-settings-popover"

interface FloatingLeftToolbarProps {
  editor: Editor | null
  onOpenAi?: () => void
  position?: ToolbarPosition
  embedded?: boolean
}

export function FloatingLeftToolbar({
  editor,
  onOpenAi,
  position = "bottom",
  embedded = false,
}: FloatingLeftToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")

  if (!editor) {
    return null
  }

  const isBottom = position === "bottom"

  function handleSetLink(e: React.FormEvent) {
    e.preventDefault()
    if (!editor) return
    const trimmed = linkUrl.trim()
    if (trimmed === "") {
      editor.chain().focus().unsetLink().run()
    } else {
      const url =
        trimmed.startsWith("http://") || trimmed.startsWith("https://")
          ? trimmed
          : `https://${trimmed}`
      editor.chain().focus().setLink({ href: url }).run()
    }
    setLinkOpen(false)
  }

  const currentBlockName = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
    ? "H2"
    : editor.isActive("heading", { level: 3 })
    ? "H3"
    : editor.isActive("taskList")
    ? "To-do"
    : editor.isActive("bulletList")
    ? "Bullet"
    : editor.isActive("orderedList")
    ? "Number"
    : editor.isActive("blockquote")
    ? "Quote"
    : editor.isActive("codeBlock")
    ? "Code"
    : "Text"

  const dividerClass = isBottom
    ? "w-px h-5 bg-border/80 mx-1 shrink-0"
    : "h-px w-5 bg-border/80 my-1 shrink-0"

  const groupClass = isBottom
    ? "flex items-center gap-0.5 shrink-0"
    : "flex flex-col items-center gap-0.5 shrink-0"

  return (
    <aside
      role="toolbar"
      aria-label="Editor formatting tools"
      className={
        embedded
          ? isBottom
            ? "sticky bottom-4 mx-auto mt-6 z-30 flex w-fit items-center gap-1 rounded-2xl border border-border/80 bg-card/95 px-2.5 py-1.5 shadow-xl backdrop-blur-xl transition-all duration-300 max-w-full overflow-x-auto"
            : "fixed left-4 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-center gap-1 rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-xl transition-all duration-300"
          : isBottom
          ? "fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-2xl border border-border/80 bg-card/90 px-2.5 py-1.5 shadow-2xl backdrop-blur-xl transition-all duration-300 max-w-[calc(100vw-2rem)] overflow-x-auto"
          : "fixed left-5 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-1 rounded-2xl border border-border/80 bg-card/90 p-1.5 shadow-2xl backdrop-blur-xl transition-all duration-300"
      }
    >
      {/* History buttons */}
      <div className={groupClass}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Redo"
          title="Redo (Ctrl+Y)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>

      <div className={dividerClass} />

      {/* Block selector popover */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="flex h-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Change block format"
            />
          }
        >
          <span>{currentBlockName}</span>
          <ChevronDown className="size-3 opacity-60" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side={isBottom ? "top" : "right"}
          className="w-48 space-y-1 rounded-xl p-1.5 text-xs shadow-xl"
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("paragraph") &&
              !editor.isActive("blockquote") &&
              !editor.isActive("taskList")
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="font-mono text-xs w-4 text-center">¶</span>
            <span>Paragraph</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("heading", { level: 1 })
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Heading1 className="size-3.5" />
            <span>Heading 1</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("heading", { level: 2 })
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Heading2 className="size-3.5" />
            <span>Heading 2</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("heading", { level: 3 })
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Heading3 className="size-3.5" />
            <span>Heading 3</span>
          </button>
          <Separator className="my-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("taskList")
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ListTodo className="size-3.5 text-brand-ink" />
            <span>Checklist (To-do)</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("bulletList")
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <List className="size-3.5" />
            <span>Bullet List</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("orderedList")
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ListOrdered className="size-3.5" />
            <span>Numbered List</span>
          </button>
          <Separator className="my-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("blockquote")
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Quote className="size-3.5" />
            <span>Blockquote</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
              editor.isActive("codeBlock")
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Code2 className="size-3.5" />
            <span>Code Block</span>
          </button>
        </PopoverContent>
      </Popover>

      <div className={dividerClass} />

      {/* Inline styling marks */}
      <div className={groupClass}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Bold"
          title="Bold (Ctrl+B)"
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("bold")
              ? "bg-accent text-accent-foreground font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bold className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Italic"
          title="Italic (Ctrl+I)"
          aria-pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("italic")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Italic className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Underline"
          title="Underline (Ctrl+U)"
          aria-pressed={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("underline")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UnderlineIcon className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Strikethrough"
          title="Strikethrough"
          aria-pressed={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("strike")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Strikethrough className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Highlight"
          title="Highlight"
          aria-pressed={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("highlight")
              ? "bg-brand/20 text-brand-ink font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Highlighter className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Inline Code"
          title="Inline Code"
          aria-pressed={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("code")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code className="size-4" />
        </Button>

        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Insert Link"
                title="Insert Link"
                aria-pressed={editor.isActive("link")}
                onClick={() => {
                  setLinkUrl(editor.getAttributes("link").href || "")
                }}
                className={`size-8 rounded-lg ${
                  editor.isActive("link")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              />
            }
          >
            <Link2 className="size-4" />
          </PopoverTrigger>
          <PopoverContent
            side={isBottom ? "top" : "right"}
            align="center"
            className="w-64 rounded-xl p-2.5 text-xs shadow-xl"
          >
            <form onSubmit={handleSetLink} className="flex flex-col gap-2">
              <label htmlFor="link-url-input" className="font-medium text-foreground">
                Hyperlink URL
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="link-url-input"
                  type="text"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-7 text-xs"
                  autoFocus
                />
                <Button type="submit" size="xs" className="h-7 px-2">
                  Apply
                </Button>
              </div>
              {editor.isActive("link") ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run()
                    setLinkOpen(false)
                  }}
                  className="h-6 text-[10px] text-destructive"
                >
                  Remove link
                </Button>
              ) : null}
            </form>
          </PopoverContent>
        </Popover>
      </div>

      <div className={dividerClass} />

      {/* Lists, Quote, Divider, Clear formatting */}
      <div className={groupClass}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Bullet List"
          title="Bullet List"
          aria-pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("bulletList")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Checklist"
          title="Checklist"
          aria-pressed={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("taskList")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListTodo className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Blockquote"
          title="Quote Block"
          aria-pressed={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`size-8 rounded-lg ${
            editor.isActive("blockquote")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Quote className="size-4" />
        </Button>

        {!isBottom ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Insert horizontal divider"
            title="Horizontal Divider"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Minus className="size-4" />
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Clear formatting"
          title="Clear Formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <RemoveFormatting className="size-4" />
        </Button>
      </div>

      {/* Magic AI Button */}
      {onOpenAi ? (
        <>
          <div className={dividerClass} />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="AI Writing Assistant"
            title="AI Writing Assistant"
            onClick={onOpenAi}
            className="size-8 rounded-lg bg-brand/15 text-brand-ink border border-brand/30 hover:bg-brand/25 hover:text-brand-ink shrink-0"
          >
            <Wand2 className="size-4" />
          </Button>
        </>
      ) : null}
    </aside>
  )
}
