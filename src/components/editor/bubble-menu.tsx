"use client"

import { BubbleMenu } from "@tiptap/react/menus"
import type { Editor } from "@tiptap/react"
import {
  Bold,
  Code,
  Italic,
  Strikethrough,
} from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Floating formatting menu on text selection (SPEC §6). Only StarterKit
 * marks — no async positioning tricks; plain, keyboard-reachable buttons.
 */
export function EditorBubbleMenu({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 10 }}
      className="flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-md"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Bold"
        aria-pressed={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? "bg-muted text-foreground" : undefined}
      >
        <Bold className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Italic"
        aria-pressed={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? "bg-muted text-foreground" : undefined}
      >
        <Italic className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Strikethrough"
        aria-pressed={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive("strike") ? "bg-muted text-foreground" : undefined}
      >
        <Strikethrough className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Inline code"
        aria-pressed={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={editor.isActive("code") ? "bg-muted text-foreground" : undefined}
      >
        <Code className="size-4" />
      </Button>
    </BubbleMenu>
  )
}
