import { describe, expect, it } from "vitest"

import { backoffDelay, classifyFailure } from "@/lib/sync/engine"

function apiError(status: number, code = "SOME_CODE"): Error & { status: number; code: string } {
  const error = new Error("boom") as Error & { status: number; code: string }
  error.status = status
  error.code = code
  return error
}

describe("classifyFailure", () => {
  it("treats non-API errors (network) as retryable", () => {
    expect(classifyFailure(new TypeError("Failed to fetch"))).toBe("retry")
  })

  it("parks expired edit sessions for the re-verify flow", () => {
    expect(
      classifyFailure(apiError(401, "EDIT_SESSION_EXPIRED"))
    ).toBe("reauth")
  })

  it("treats other 4xx as permanent", () => {
    expect(classifyFailure(apiError(400, "VALIDATION_ERROR"))).toBe("permanent")
    expect(classifyFailure(apiError(403, "NOTE_READ_ONLY"))).toBe("permanent")
    expect(classifyFailure(apiError(404, "NOT_FOUND"))).toBe("permanent")
    // A 401 that is not an expired session is also permanent — retrying
    // cannot fix an invalid edit code.
    expect(classifyFailure(apiError(401, "INVALID_EDIT_CODE"))).toBe("permanent")
  })

  it("treats 5xx as retryable", () => {
    expect(classifyFailure(apiError(503, "INTERNAL_ERROR"))).toBe("retry")
  })
})

describe("backoffDelay", () => {
  it("grows exponentially and is capped", () => {
    expect(backoffDelay(1)).toBe(1000)
    expect(backoffDelay(2)).toBe(2000)
    expect(backoffDelay(3)).toBe(4000)
    expect(backoffDelay(10)).toBeLessThanOrEqual(60_000)
    expect(backoffDelay(50)).toBe(60_000)
  })
})
