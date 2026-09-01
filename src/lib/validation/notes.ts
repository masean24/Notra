import { z } from "zod"

export const CONTENT_FORMATS = ["tiptap_json", "markdown", "plain_text"] as const
export const EDITING_POLICIES = ["edit_code", "account", "read_only"] as const
export const VISIBILITIES = ["public", "private"] as const

export type ContentFormat = (typeof CONTENT_FORMATS)[number]
export type EditingPolicy = (typeof EDITING_POLICIES)[number]
export type Visibility = (typeof VISIBILITIES)[number]

/** Max serialized content size in bytes (1 MB). */
export const MAX_CONTENT_BYTES = 1_048_576
export const MAX_TITLE_LENGTH = 200

const titleSchema = z.string().max(MAX_TITLE_LENGTH).default("")

const contentSchema = z
  .unknown()
  .refine(
    (value) => JSON.stringify(value ?? null).length <= MAX_CONTENT_BYTES,
    "Note content exceeds the maximum size."
  )

const editCodeSchema = z
  .string()
  .min(6, "Edit code must be at least 6 characters.")
  .max(64, "Edit code must be at most 64 characters.")
  .refine((value) => !/\s/.test(value), "Edit code cannot contain whitespace.")

export const createNoteSchema = z
  .object({
    title: titleSchema,
    content: contentSchema,
    contentFormat: z.enum(CONTENT_FORMATS).default("tiptap_json"),
    editingPolicy: z.enum(EDITING_POLICIES).default("edit_code"),
    visibility: z.enum(VISIBILITIES).default("public"),
    /** Required when editingPolicy is "edit_code". */
    editCode: editCodeSchema.optional(),
    /** ISO datetime; must be in the future when provided. */
    expiresAt: z
      .iso.datetime({ offset: true })
      .refine(
        (value) => new Date(value).getTime() > Date.now(),
        "Expiration must be in the future."
      )
      .optional(),
  })
  .refine(
    (data) => data.editingPolicy !== "edit_code" || data.editCode !== undefined,
    { message: "An edit code is required for the edit-code policy.", path: ["editCode"] }
  )

export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const saveNoteSchema = z.object({
  title: titleSchema,
  content: contentSchema,
  contentFormat: z.enum(CONTENT_FORMATS).default("tiptap_json"),
})

export type SaveNoteInput = z.infer<typeof saveNoteSchema>

export const verifyEditSchema = z.object({
  code: z.string().min(1, "Enter the edit code.").max(64),
})
