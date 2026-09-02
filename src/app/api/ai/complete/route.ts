import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { decryptSecret } from "@/lib/ai/crypto"
import { completeWithGemini, GeminiError } from "@/lib/ai/gemini"
import { buildPrompt } from "@/lib/ai/prompts"
import { consumeRateLimit, getClientIp, hashIp } from "@/lib/rate-limit"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { aiCompleteSchema } from "@/lib/ai/prompts"

const RATE_PER_HOUR = 30

/**
 * The single AI call path (SPEC §12). The caller's own Gemini key travels in
 * the request body for guests; signed-in users' keys are decrypted
 * server-side from their encrypted profile field. Keys are never logged,
 * never stored by this route, and never returned to any other user.
 */
export async function POST(request: NextRequest) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }

  const supabase = await createClient()
  const ipHash = hashIp(getClientIp(request))
  const allowed = await consumeRateLimit(
    supabase,
    `ai:${ipHash}`,
    RATE_PER_HOUR,
    60 * 60
  )
  if (!allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many AI requests. Please try again later."
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = aiCompleteSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }
  const input = parsed.data

  // Resolve the key: guests bring their own; signed-in users use the
  // encrypted key from their profile.
  let apiKey = input.apiKey ?? null
  if (!apiKey) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: ciphertext, error } = await supabase.rpc(
        "load_own_gemini_key"
      )
      if (!error && typeof ciphertext === "string" && ciphertext) {
        try {
          apiKey = decryptSecret(ciphertext)
        } catch {
          apiKey = null
        }
      }
    }
  }
  if (!apiKey) {
    return errorResponse(
      400,
      "AI_KEY_REQUIRED",
      "Add your Gemini API key to enable AI writing help."
    )
  }

  try {
    const result = await completeWithGemini(apiKey, buildPrompt(input))
    return successResponse({ text: result.text })
  } catch (error) {
    if (error instanceof GeminiError) {
      return errorResponse(error.status, "AI_PROVIDER_ERROR", error.message)
    }
    // Never log the key or request body here.
    console.error("ai/complete failed:", error instanceof Error ? error.message : "unknown")
    return errorResponse(
      502,
      "AI_PROVIDER_ERROR",
      "Could not reach the Gemini API. Try again shortly."
    )
  }
}
