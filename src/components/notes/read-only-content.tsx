"use client"

import { EditorContent, useEditor } from "@tiptap/react"
import type { JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

/**
 * Read-only Tiptap rendering shared by the public note page, the share-link
 * view, and the revision viewer. Tiptap only renders nodes its schema knows,
 * so untrusted content is never injected raw (Section 16).
 */
export function ReadOnlyContent({
  content,
  ariaLabel = "Note content",
}: {
  content: unknown
  ariaLabel?: string
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: (content ?? "") as JSONContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap",
        "aria-label": ariaLabel,
      },
    },
  })

  return <EditorContent editor={editor} />
}
