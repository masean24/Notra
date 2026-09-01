interface TiptapNode {
  type?: string
  text?: string
  content?: TiptapNode[]
}

/**
 * Derives a note title from Tiptap JSON: the first non-empty text, from
 * headings first, then any block. Truncated to a readable length.
 */
export function deriveTitleFromContent(content: unknown): string {
  const nodes = (content as TiptapNode | null)?.content ?? []
  let fallback = ""

  for (const block of nodes) {
    const text = collectText(block).trim()
    if (!text) {
      continue
    }
    if (block.type?.startsWith("heading")) {
      return truncate(text)
    }
    if (!fallback) {
      fallback = text
    }
  }
  return truncate(fallback)
}

function collectText(node: TiptapNode): string {
  if (node.text) {
    return node.text
  }
  return (node.content ?? []).map(collectText).join(" ")
}

function truncate(text: string): string {
  return text.length > 80 ? `${text.slice(0, 77)}…` : text
}
