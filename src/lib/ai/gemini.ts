/**
 * Gemini client (SPEC §12). One call path for the whole app; the provider
 * lives behind `completeWithGemini` so it can be swapped later.
 *
 * The caller's own key is sent via the x-goog-api-key header — never in the
 * URL (logs), never persisted, never forwarded anywhere else. No key in this
 * module: every call receives the user's key explicitly.
 */

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

export interface GeminiResult {
  text: string
}

export class GeminiError extends Error {
  status: number

  constructor(message: string, status = 502) {
    super(message)
    this.status = status
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
}

/** Extracts the first non-empty text part from a Gemini response. */
export function parseGeminiResponse(body: GeminiResponse): GeminiResult {
  const blocked = body.promptFeedback?.blockReason
  if (blocked) {
    throw new GeminiError(`The request was blocked (${blocked}).`, 400)
  }
  const text =
    body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? ""
  if (!text) {
    throw new GeminiError("The model returned an empty response.")
  }
  return { text }
}

export async function completeWithGemini(
  apiKey: string,
  prompt: string
): Promise<GeminiResult> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
    // The key only lives in this header for the duration of the call.
    signal: AbortSignal.timeout(30_000),
  })

  let body: GeminiResponse
  try {
    body = (await response.json()) as GeminiResponse
  } catch {
    throw new GeminiError("Could not reach the Gemini API.")
  }

  if (!response.ok) {
    const message = body.error?.message ?? ""
    if (response.status === 400 && /api key/i.test(message)) {
      throw new GeminiError("That Gemini API key was rejected. Check it and try again.", 400)
    }
    if (response.status === 429) {
      throw new GeminiError("Gemini rate limit reached for your key. Try again shortly.", 429)
    }
    throw new GeminiError("The Gemini API returned an error. Try again.", 502)
  }

  return parseGeminiResponse(body)
}
