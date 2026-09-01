import { describe, expect, it } from "vitest"

import {
  generateRandomEditCode,
  isValidCustomEditCode,
} from "@/lib/notes/edit-code"

describe("generateRandomEditCode", () => {
  it("matches the XXXX-XXXX-XXXX format", () => {
    expect(generateRandomEditCode()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  })

  it("never contains ambiguous characters (O, 0, I, 1)", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateRandomEditCode()
      expect(code).not.toMatch(/[O0I1]/)
    }
  })

  it("produces distinct codes across many draws", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRandomEditCode()))
    expect(codes.size).toBeGreaterThan(190)
  })
})

describe("isValidCustomEditCode", () => {
  it("accepts 6–64 characters without whitespace", () => {
    expect(isValidCustomEditCode("abc123")).toBe(true)
    expect(isValidCustomEditCode("a".repeat(64))).toBe(true)
    expect(isValidCustomEditCode("with-dash_and_underscore")).toBe(true)
  })

  it("rejects too-short and too-long codes", () => {
    expect(isValidCustomEditCode("abc12")).toBe(false)
    expect(isValidCustomEditCode("a".repeat(65))).toBe(false)
  })

  it("rejects whitespace anywhere", () => {
    expect(isValidCustomEditCode("abc 123")).toBe(false)
    expect(isValidCustomEditCode("abc\t123")).toBe(false)
    expect(isValidCustomEditCode(" 12345")).toBe(false)
  })
})
