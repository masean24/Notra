import { describe, expect, it } from "vitest"

import { encryptSecret, decryptSecret } from "@/lib/ai/crypto"
import { completeWithGemini, GeminiError, parseGeminiResponse } from "@/lib/ai/gemini"
import { aiCompleteSchema, buildPrompt, geminiKeySchema } from "@/lib/ai/prompts"

// Unit tests must not depend on the operator's .env.local — provide a valid
// 32-byte key when the environment has none. The module reads it per call.
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64")
}

describe("aiCompleteSchema", () => {
  it("accepts a valid guest payload with a key", () => {
    const result = aiCompleteSchema.safeParse({
      mode: "rewrite",
      apiKey: "AIzaSyD-1234567890abcdefg",
      context: "Half-finished sentence",
      instruction: "make it more concise",
    })
    expect(result.success).toBe(true)
  })

  it("defaults the mode and omits optional fields", () => {
    const result = aiCompleteSchema.safeParse({ context: "Some text" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.mode).toBe("continue")
      expect(result.data.apiKey).toBeUndefined()
    }
  })

  it("rejects unknown modes and empty context", () => {
    expect(
      aiCompleteSchema.safeParse({ mode: "translate", context: "text" }).success
    ).toBe(false)
    expect(aiCompleteSchema.safeParse({ context: "" }).success).toBe(false)
  })

  it("rejects oversized context", () => {
    const result = aiCompleteSchema.safeParse({ context: "a".repeat(20_001) })
    expect(result.success).toBe(false)
  })
})

describe("geminiKeySchema", () => {
  it("trims and accepts a plausible key", () => {
    const result = geminiKeySchema.safeParse({ apiKey: "  AIzaSyD-1234567890abcdefg  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.apiKey).toBe("AIzaSyD-1234567890abcdefg")
    }
  })

  it("rejects short strings", () => {
    expect(geminiKeySchema.safeParse({ apiKey: "too-short" }).success).toBe(false)
  })
})

describe("buildPrompt", () => {
  it("embeds the note text for plain modes", () => {
    const prompt = buildPrompt({ mode: "summarize", context: "Line one" })
    expect(prompt).toContain("Line one")
    expect(prompt).toContain("Summarize")
  })

  it("attaches the instruction for rewrite mode", () => {
    const prompt = buildPrompt({
      mode: "rewrite",
      context: "Draft",
      instruction: "use a formal tone",
    })
    expect(prompt).toContain("use a formal tone")
  })
})

describe("gemini response parsing", () => {
  it("joins text parts from the first candidate", () => {
    const result = parseGeminiResponse({
      candidates: [
        { content: { parts: [{ text: "Hello " }, { text: "world" }] } },
      ],
    })
    expect(result.text).toBe("Hello world")
  })

  it("throws on a blocked prompt", () => {
    expect(() =>
      parseGeminiResponse({ promptFeedback: { blockReason: "SAFETY" } })
    ).toThrow(GeminiError)
  })

  it("throws on an empty candidate list", () => {
    expect(() => parseGeminiResponse({ candidates: [] })).toThrow(GeminiError)
  })
})

describe("encryptSecret/decryptSecret", () => {
  it("round-trips a Gemini key", () => {
    const plaintext = "AIzaSyD-roundtrip-test-key"
    const ciphertext = encryptSecret(plaintext)
    expect(ciphertext).toMatch(/^v1:/)
    expect(ciphertext).not.toContain(plaintext)
    expect(decryptSecret(ciphertext)).toBe(plaintext)
  })

  it("rejects tampered ciphertext via the GCM auth tag", () => {
    const ciphertext = encryptSecret("AIzaSyD-1234567890abcdefg")
    const parts = ciphertext.split(":")
    const tampered = [...parts.slice(0, 3), "AAAA" + parts[3]!.slice(4)].join(":")
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it("rejects malformed payloads", () => {
    expect(() => decryptSecret("not-a-ciphertext")).toThrow(
      "INVALID_CIPHERTEXT_FORMAT"
    )
  })
})

describe("completeWithGemini", () => {
  it("rejects the caller's key via the header, not the URL", async () => {
    let requestUrl = ""
    let requestHeaders: Headers | undefined
    let request: unknown
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      const req = input as Request
      requestUrl = req.url ?? String(input)
      requestHeaders = new Headers(init?.headers)
      request = init?.body
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "ok" }] } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    }) as typeof fetch
    try {
      const result = await completeWithGemini("user-key-123", "prompt text")
      expect(result.text).toBe("ok")
      expect(requestUrl).not.toContain("user-key-123")
      expect(requestHeaders?.get("x-goog-api-key")).toBe("user-key-123")
      expect(String(request)).not.toContain("user-key-123")
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
