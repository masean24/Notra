"use client"

import { useMemo } from "react"
import { Link2 } from "lucide-react"

export interface OutlineHeading {
  level: number
  text: string
  /** Index among all h1–h6 elements in the rendered document. */
  domIndex: number
}

interface HeadingNode {
  type?: string
  attrs?: { level?: number }
  content?: { text?: string }[]
}

function collectWithLevels(node: HeadingNode | undefined): OutlineHeading[] {
  const headings: OutlineHeading[] = []
  const walk = (n: HeadingNode | undefined): void => {
    if (!n) {
      return
    }
    if (n.type === "heading") {
      headings.push({
        level: n.attrs?.level ?? 1,
        text: (n.content ?? []).map((c) => c.text ?? "").join(""),
        domIndex: headings.length,
      })
      return
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        walk(child as HeadingNode)
      }
    }
  }
  walk(node)
  return headings
}

/**
 * Auto-generated table of contents (SPEC §6): headings in document order,
 * click to scroll, copy an anchor link, indented by level.
 */
export function TocPanel({
  content,
  onJump,
  onCopyAnchor,
}: {
  content: unknown
  onJump: (domIndex: number) => void
  onCopyAnchor: (heading: OutlineHeading) => void
}) {
  const headings = useMemo(() => collectWithLevels(content as HeadingNode), [content])

  if (headings.length === 0) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        Add headings (H1–H3 in the toolbar) to build the outline.
      </p>
    )
  }

  return (
    <nav aria-label="Table of contents" className="flex flex-col gap-0.5 p-2">
      {headings.map((heading, index) => (
        <div
          key={index}
          className="group flex items-center gap-1"
          style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
        >
          <button
            type="button"
            onClick={() => onJump(heading.domIndex)}
            className="min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-sm hover:bg-muted"
            title={heading.text}
          >
            {heading.text || "Untitled heading"}
          </button>
          <button
            type="button"
            aria-label={`Copy link to heading: ${heading.text || "Untitled"}`}
            className="invisible rounded p-1 text-muted-foreground hover:text-foreground group-hover:visible"
            onClick={() => onCopyAnchor(heading)}
          >
            <Link2 className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </nav>
  )
}
