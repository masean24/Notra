import { describe, expect, it } from "vitest"

import { diffWords } from "@/lib/notes/diff"
import {
  isTiptapDoc,
  markdownToDoc,
  parseImportFile,
  toHtml,
  toMarkdown,
  toJsonBackup,
  toPlainText,
} from "@/lib/notes/serialize"

const doc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Plan" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", marks: [{ type: "bold" }], text: "Important" },
        { type: "text", text: " detail with " },
        { type: "text", marks: [{ type: "code" }], text: "code" },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "first" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "second" }] }],
        },
      ],
    },
    {
      type: "codeBlock",
      content: [{ type: "text", text: "const x = 1" }],
    },
  ],
}

describe("diffWords", () => {
  it("marks added and removed words, keeping shared runs", () => {
    const segments = diffWords("the quick brown fox", "the slow brown fox")
    expect(segments).toEqual([
      { type: "same", text: "the" },
      { type: "removed", text: "quick" },
      { type: "added", text: "slow" },
      { type: "same", text: "brown fox" },
    ])
  })

  it("returns empty for identical texts", () => {
    expect(diffWords("same text", "same text")).toEqual([
      { type: "same", text: "same text" },
    ])
  })

  it("handles an empty old text as pure additions", () => {
    expect(diffWords("", "hello world")).toEqual([
      { type: "added", text: "hello world" },
    ])
  })
})

describe("export serializers", () => {
  it("exports plain text", () => {
    const text = toPlainText(doc)
    expect(text).toContain("Plan")
    expect(text).toContain("Important detail with code")
    expect(text).toContain("• first")
    expect(text).toContain("• second")
    expect(text).toContain("const x = 1")
  })

  it("exports markdown with marks and blocks", () => {
    const md = toMarkdown(doc)
    expect(md).toContain("# Plan")
    expect(md).toContain("**Important** detail with `code`")
    expect(md).toContain("- first")
    expect(md).toContain("- second")
    expect(md).toContain("```\nconst x = 1\n```")
  })

  it("escapes HTML in exported content", () => {
    const html = toHtml({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "<script>alert('x')</script>",
            },
          ],
        },
      ],
    })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })
})

describe("import parser", () => {
  it("round-trips a JSON backup", () => {
    const backup = toJsonBackup("My title", doc)
    const imported = parseImportFile("note.json", backup)
    expect(imported.title).toBe("My title")
    expect(imported.content).toEqual(doc)
  })

  it("rejects malformed JSON backups", () => {
    expect(() => parseImportFile("x.json", "{not json")).toThrow(
      "IMPORT_INVALID_JSON"
    )
    expect(() => parseImportFile("x.json", JSON.stringify({ content: { type: 42 } }))).toThrow(
      "IMPORT_INVALID_JSON"
    )
    // A JSON object that is not a document at all.
    expect(() => parseImportFile("x.json", JSON.stringify({ hello: "world" }))).toThrow(
      "IMPORT_INVALID_JSON"
    )
  })

  it("converts markdown blocks and inline marks", () => {
    const md = "# Title\n\nSome **bold** and `code` text\n\n- item one\n- item two\n\n> quoted\n\n---\n\n```\ncode line\n```"
    const imported = parseImportFile("note.md", md)
    expect(isTiptapDoc(imported.content)).toBe(true)
    expect(toMarkdown(imported.content)).toContain("# Title")
    expect(toMarkdown(imported.content)).toContain("**bold**")
    expect(toMarkdown(imported.content)).toContain("- item one")
  })

  it("treats .txt as plain paragraphs", () => {
    const imported = parseImportFile("note.txt", "line one\nline two")
    expect(isTiptapDoc(imported.content)).toBe(true)
    expect(toPlainText(imported.content)).toContain("line one line two")
  })

  it("markdownToDoc produces a valid document", () => {
    expect(isTiptapDoc(markdownToDoc("hello"))).toBe(true)
    expect(isTiptapDoc(markdownToDoc(""))).toBe(true)
  })
})
