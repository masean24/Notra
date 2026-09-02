import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { encryptSecret } from "@/lib/ai/crypto"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { geminiKeySchema } from "@/lib/ai/prompts"

/**
 * BYOK Gemini key management for signed-in users (SPEC §12). The key is
 * encrypted at rest with ENCRYPTION_KEY (AES-256-GCM) before it reaches the
 * database; the plaintext is never logged and never returned to the client.
 */
export async function PUT(request: NextRequest) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to manage settings.")
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = geminiKeySchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const ciphertext = encryptSecret(parsed.data.apiKey)
  const { data, error } = await supabase.rpc("save_own_gemini_key", {
    p_ciphertext: ciphertext,
  })
  if (error || (data as { status?: string })?.status !== "ok") {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not save the key. Please try again."
    )
  }
  return successResponse({ saved: true })
}

/** Removes the stored key. */
export async function DELETE(request: NextRequest) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to manage settings.")
  }

  const { error } = await supabase.rpc("clear_own_gemini_key")
  if (error) {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not remove the key. Please try again."
    )
  }
  return successResponse({ cleared: true })
}

/** Whether a key is stored — never returns the key or its ciphertext. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to manage settings.")
  }

  const { data: ciphertext, error } = await supabase.rpc("load_own_gemini_key")
  if (error) {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not read the key status. Please try again."
    )
  }
  return successResponse({ hasKey: Boolean(ciphertext) })
}
