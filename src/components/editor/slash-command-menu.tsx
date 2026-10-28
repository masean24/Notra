"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import type { Editor } from "@tiptap/react"
import {
  Heading1,
  Heading2,
  Heading3,
  ListTodo,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Sparkles,
  LayoutTemplate,
  Type,
} from "lucide-react"

interface SlashCommandMenuProps {
  editor: Editor | null
  onOpenTemplates?: () => void
  onOpenAi?: () => void
}

interface CommandItem {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  action: (editor: Editor) => void
}

export function SlashCommandMenu({
  editor,
  onOpenTemplates,
  onOpenAi,
}: SlashCommandMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const items: CommandItem[] = useMemo(
    () => [
      {
        id: "paragraph",
        title: "Text",
        subtitle: "Normal body paragraph",
        icon: <Type className="size-4" />,
        action: (ed) => ed.chain().focus().setParagraph().run(),
      },
      {
        id: "h1",
        title: "Heading 1",
        subtitle: "Large document heading",
        icon: <Heading1 className="size-4" />,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: "h2",
        title: "Heading 2",
        subtitle: "Medium section heading",
        icon: <Heading2 className="size-4" />,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: "h3",
        title: "Heading 3",
        subtitle: "Small subsection heading",
        icon: <Heading3 className="size-4" />,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: "todo",
        title: "To-do List",
        subtitle: "Track tasks with checkable boxes",
        icon: <ListTodo className="size-4 text-brand-ink" />,
        action: (ed) => ed.chain().focus().toggleTaskList().run(),
      },
      {
        id: "bullet",
        title: "Bullet List",
        subtitle: "Simple bulleted list",
        icon: <List className="size-4" />,
        action: (ed) => ed.chain().focus().toggleBulletList().run(),
      },
      {
        id: "number",
        title: "Numbered List",
        subtitle: "Sequential numbered list",
        icon: <ListOrdered className="size-4" />,
        action: (ed) => ed.chain().focus().toggleOrderedList().run(),
      },
      {
        id: "quote",
        title: "Quote",
        subtitle: "Capture a quote or highlight",
        icon: <Quote className="size-4" />,
        action: (ed) => ed.chain().focus().toggleBlockquote().run(),
      },
      {
        id: "code",
        title: "Code Block",
        subtitle: "Formatted code snippet",
        icon: <Code2 className="size-4" />,
        action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: "divider",
        title: "Divider",
        subtitle: "Visually separate sections",
        icon: <Minus className="size-4" />,
        action: (ed) => ed.chain().focus().setHorizontalRule().run(),
      },
      ...(onOpenTemplates
        ? [
            {
              id: "templates",
              title: "Templates",
              subtitle: "Insert a pre-built structure",
              icon: <LayoutTemplate className="size-4 text-brand-ink" />,
              action: () => onOpenTemplates(),
            },
          ]
        : []),
      ...(onOpenAi
        ? [
            {
              id: "ai",
              title: "AI Writing Assistant",
              subtitle: "Draft, rewrite, or brainstorm with Gemini",
              icon: <Sparkles className="size-4 text-brand-ink" />,
              action: () => onOpenAi(),
            },
          ]
        : []),
    ],
    [onOpenTemplates, onOpenAi]
  )

  const closeMenu = useCallback(() => {
    setOpen(false)
    setSelectedIndex(0)
  }, [])

  const executeItem = useCallback(
    (index: number) => {
      if (!editor) return
      const item = items[index]
      if (!item) return

      // Delete the trigger "/" character
      const { state } = editor
      const { selection } = state
      const { $from } = selection
      const currentLineText = $from.parent.textContent
      if (currentLineText.endsWith("/")) {
        editor.commands.deleteRange({ from: $from.pos - 1, to: $from.pos })
      }

      item.action(editor)
      closeMenu()
    },
    [editor, items, closeMenu]
  )

  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (view: unknown, event: KeyboardEvent) => {
      if (!open) {
        if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
          // Check if at start of block or after whitespace
          const { state } = editor
          const { selection } = state
          const { $from } = selection
          const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc")
          if (textBefore.trim() === "") {
            // Get cursor coordinates
            const coords = editor.view.coordsAtPos($from.pos)
            setPosition({
              x: Math.min(window.innerWidth - 280, Math.max(16, coords.left)),
              y: coords.bottom + 8,
            })
            setOpen(true)
            setSelectedIndex(0)
          }
        }
        return false
      }

      if (event.key === "Escape") {
        closeMenu()
        return true
      }

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % items.length)
        return true
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
        return true
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        executeItem(selectedIndex)
        return true
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        setTimeout(() => {
          const { state } = editor
          const { selection } = state
          const text = selection.$from.parent.textContent
          if (!text.includes("/")) {
            closeMenu()
          }
        }, 10)
      }

      return false
    }

    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        handleKeyDown,
      },
    })
  }, [editor, open, selectedIndex, items, executeItem, closeMenu])

  if (!open) return null

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Slash commands"
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      className="fixed z-50 max-h-72 w-64 overflow-y-auto rounded-xl border bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md transition-all text-xs"
    >
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Insert Block
      </div>
      {items.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          onClick={() => executeItem(idx)}
          onMouseEnter={() => setSelectedIndex(idx)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
            selectedIndex === idx
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-background/80 shadow-2xs">
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium leading-tight text-foreground">{item.title}</div>
            <div className="truncate text-[10px] text-muted-foreground">{item.subtitle}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
