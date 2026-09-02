import { z } from "zod"

/** AI assistant modes (SPEC §12). Each mode shapes the prompt server-side. */
export const AI_MODES = ["continue", "rewrite", "summarize", "title"] as const
export type AiMode = (typeof AI_MODES)[number]

export const aiCompleteSchema = z.object({
  mode: z.enum(AI_MODES).default("continue"),
  /** The user's own Gemini key (guests). Logged-in users omit it. */
  apiKey: z.string().min(20).max(200).optional(),
  /** Notebook text the mode operates on. */
  context: z.string().min(1, "Write something first.").max(20_000),
  /** Optional extra instruction (rewrite mode). */
  instruction: z.string().max(2_000).optional(),
})

export type AiCompleteInput = z.infer<typeof aiCompleteSchema>

export const geminiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, "That does not look like a Gemini API key.")
    .max(200),
})

export const AI_PROMPTS: Record<AiMode, string> = {
  continue:
    "You are a writing assistant inside a note-taking app. Continue the user's note naturally from where it stops, matching the existing tone and language. Reply with the continuation text only — no preamble, no explanations.",
  rewrite:
    "You are a writing assistant inside a note-taking app. Rewrite the user's note text according to their instruction. Reply with the rewritten text only — no preamble, no explanations.",
  summarize:
    "You are a writing assistant inside a note-taking app. Summarize the user's note as a short bullet list. Reply with the summary only — no preamble.",
  title:
    "You are a writing assistant inside a note-taking app. Suggest exactly one concise title (max 60 characters) for the user's note. Reply with the title text only — no quotes, no preamble.",
}

export function buildPrompt(input: AiCompleteInput): string {
  const base = AI_PROMPTS[input.mode]
  if (input.mode === "rewrite" && input.instruction) {
    return `${base}\n\nInstruction: ${input.instruction}\n\nNote text:\n${input.context}`
  }
  return `${base}\n\nNote text:\n${input.context}`
}
