"use client"

import { useEffect, useMemo } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import type { JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Highlight from "@tiptap/extension-highlight"

import { toHtml } from "@/lib/notes/serialize"

function normalizeDocContent(raw: unknown): JSONContent | string {
  if (!raw) return ""
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        return JSON.parse(trimmed) as JSONContent
      } catch {
        // Treat as plain text paragraph
      }
    }
    return {
      type: "doc",
      content: trimmed
        ? [
            {
              type: "paragraph",
              content: [{ type: "text", text: raw }],
            },
          ]
        : [],
    }
  }
  return raw as JSONContent
}

/**
 * Read-only Tiptap rendering shared by the public note page, the share-link
 * view, and the revision viewer. Includes all extensions used by NoteEditor
 * (StarterKit, TaskList, TaskItem, Highlight) plus safe SSR HTML fallback.
 */
export function ReadOnlyContent({
  content,
  ariaLabel = "Note content",
}: {
  content: unknown
  ariaLabel?: string
}) {
  const normalizedContent = useMemo(() => normalizeDocContent(content), [content])

  const fallbackHtml = useMemo(() => {
    try {
      return toHtml(normalizedContent)
    } catch {
      return ""
    }
  }, [normalizedContent])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: true,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
    ],
    content: normalizedContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap",
        "aria-label": ariaLabel,
      },
    },
  })

  useEffect(() => {
    if (editor && normalizedContent) {
      try {
        editor.commands.setContent(normalizedContent)
      } catch {
        // Fallback HTML handles any edge-case schema mismatch
      }
    }
  }, [editor, normalizedContent])

  // Render pre-escaped HTML during SSR or if editor is empty while fallbackHtml has content
  if (!editor || (editor.isEmpty && fallbackHtml.trim().length > 0)) {
    return (
      <div
        className="tiptap"
        aria-label={ariaLabel}
        dangerouslySetInnerHTML={{ __html: fallbackHtml }}
      />
    )
  }

  return <EditorContent editor={editor} />
}
