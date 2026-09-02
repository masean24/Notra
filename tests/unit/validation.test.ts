import { describe, expect, it } from "vitest"

import {
  createNoteSchema,
  saveNoteSchema,
  updateNoteSchema,
  verifyEditSchema,
} from "@/lib/validation/notes"
import { deriveTitleFromContent } from "@/lib/notes/title"
import { extractPublicId } from "@/lib/notes/public-id"

describe("createNoteSchema", () => {
  const validBase = {
    title: "My note",
    content: { type: "doc", content: [] },
    contentFormat: "tiptap_json",
    editingPolicy: "edit_code",
    visibility: "public",
    editCode: "ABCD-EFGH-JKLM",
  }

  it("accepts a valid guest note payload", () => {
    const result = createNoteSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it("requires an edit code for the edit_code policy", () => {
    const result = createNoteSchema.safeParse({
      ...validBase,
      editCode: undefined,
    })
    expect(result.success).toBe(false)
  })

  it("rejects edit codes with whitespace", () => {
    const result = createNoteSchema.safeParse({
      ...validBase,
      editCode: "my secret code",
    })
    expect(result.success).toBe(false)
  })

  it("rejects edit codes shorter than 6 characters", () => {
    const result = createNoteSchema.safeParse({ ...validBase, editCode: "abc" })
    expect(result.success).toBe(false)
  })

  it("rejects unknown editing policies", () => {
    const result = createNoteSchema.safeParse({
      ...validBase,
      editingPolicy: "everyone",
    })
    expect(result.success).toBe(false)
  })

  it("rejects past expiration dates", () => {
    const result = createNoteSchema.safeParse({
      ...validBase,
      expiresAt: "2000-01-01T00:00:00Z",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a future expiration with offset", () => {
    const result = createNoteSchema.safeParse({
      ...validBase,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it("rejects oversized content", () => {
    const result = createNoteSchema.safeParse({
      ...validBase,
      content: { blob: "x".repeat(1_048_577) },
    })
    expect(result.success).toBe(false)
  })

  it("rejects titles over 200 characters", () => {
    const result = createNoteSchema.safeParse({
      ...validBase,
      title: "x".repeat(201),
    })
    expect(result.success).toBe(false)
  })
})

describe("saveNoteSchema", () => {
  it("accepts a valid save payload", () => {
    const result = saveNoteSchema.safeParse({
      title: "T",
      content: { type: "doc", content: [] },
      contentFormat: "tiptap_json",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid content formats", () => {
    const result = saveNoteSchema.safeParse({
      title: "T",
      content: {},
      contentFormat: "html",
    })
    expect(result.success).toBe(false)
  })
})

describe("verifyEditSchema", () => {
  it("requires a non-empty code", () => {
    expect(verifyEditSchema.safeParse({ code: "" }).success).toBe(false)
    expect(verifyEditSchema.safeParse({ code: "K8F2" }).success).toBe(true)
  })
})

describe("updateNoteSchema", () => {
  it("accepts individual field updates", () => {
    expect(updateNoteSchema.safeParse({ favorite: true }).success).toBe(true)
    expect(
      updateNoteSchema.safeParse({ title: "Renamed", visibility: "private" })
        .success
    ).toBe(true)
  })

  it("rejects an empty update", () => {
    expect(updateNoteSchema.safeParse({}).success).toBe(false)
  })

  it("rejects unknown visibilities", () => {
    expect(
      updateNoteSchema.safeParse({ visibility: "unlisted" }).success
    ).toBe(false)
  })
})

describe("extractPublicId", () => {
  it("accepts a bare 7-character ID", () => {
    expect(extractPublicId("uqQzCpM")).toBe("uqQzCpM")
    expect(extractPublicId("  uqQzCpM  ")).toBe("uqQzCpM")
  })

  it("extracts the ID from a full share URL", () => {
    expect(extractPublicId("https://opennotepad.app/n/uqQzCpM")).toBe(
      "uqQzCpM"
    )
    expect(extractPublicId("http://localhost:3000/n/Ab8KxP2/")).toBe(
      "Ab8KxP2"
    )
  })

  it("extracts the ID from a relative path", () => {
    expect(extractPublicId("/n/Ab8KxP2")).toBe("Ab8KxP2")
  })

  it("returns null for anything else", () => {
    expect(extractPublicId("")).toBeNull()
    expect(extractPublicId("short")).toBeNull()
    expect(extractPublicId("way-too-long-input")).toBeNull()
    expect(extractPublicId("https://opennotepad.app/other/Ab8KxP2")).toBeNull()
    expect(extractPublicId("https://opennotepad.app/n/Ab8KxP2/extra")).toBeNull()
    expect(extractPublicId("not a url")).toBeNull()
  })
})

describe("deriveTitleFromContent", () => {
  it("prefers the first heading", () => {
    expect(
      deriveTitleFromContent({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "intro" }] },
          { type: "heading", content: [{ type: "text", text: "Chapter 1" }] },
        ],
      })
    ).toBe("Chapter 1")
  })

  it("falls back to the first paragraph text", () => {
    expect(
      deriveTitleFromContent({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "hello world" }] },
        ],
      })
    ).toBe("hello world")
  })

  it("returns empty for an empty document", () => {
    expect(deriveTitleFromContent({ type: "doc", content: [] })).toBe("")
    expect(deriveTitleFromContent(null)).toBe("")
  })
})
