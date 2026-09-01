import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import { hasSupabaseEnv } from "../setup"

/**
 * Integration tests against the real Supabase project: the SECURITY DEFINER
 * RPCs and the Row Level Security grants from migration 0002. Skipped when
 * Supabase env vars are not configured.
 */
const d = describe.runIf(hasSupabaseEnv)

let anon: ReturnType<typeof createClient<Database>>
let service: ReturnType<typeof createClient<Database>> | null
const createdPublicIds: string[] = []

function testCode(): string {
  return `T-${randomBytes(4).toString("hex")}`
}

function testIpHash(): string {
  return `test-${randomBytes(8).toString("hex")}`
}

beforeAll(() => {
  anon = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    service = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
})

d("create_guest_note RPC", () => {
  it("creates a note and returns a 7-character random public_id", async () => {
    const { data, error } = await anon.rpc("create_guest_note", {
      p_title: "Integration note",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_editing_policy: "edit_code",
      p_edit_code: testCode(),
      p_expires_at: null,
      p_visibility: "public",
    })
    expect(error).toBeNull()
    expect(data).toMatch(/^[A-Za-z0-9]{7}$/)
    createdPublicIds.push(data as string)
  })

  it("rejects an edit_code policy without a valid code", async () => {
    const { error } = await anon.rpc("create_guest_note", {
      p_title: "x",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_editing_policy: "edit_code",
      p_edit_code: "abc",
      p_expires_at: null,
      p_visibility: "public",
    })
    expect(error?.message).toContain("INVALID_EDIT_CODE")
  })
})

d("Row Level Security grants", () => {
  it("allows anon selects of public columns but hides edit_code_hash", async () => {
    const publicId = createdPublicIds[0]

    // Public columns are readable.
    const { data, error } = await anon
      .from("notes")
      .select("public_id, title, content, visibility")
      .eq("public_id", publicId)
      .single()
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(Object.keys(data ?? {})).not.toContain("edit_code_hash")

    // The hash column is not grantable to anon — requesting it must fail.
    const { error: hashError } = await anon
      .from("notes")
      .select("edit_code_hash")
      .eq("public_id", publicId)
      .single()
    expect(hashError).not.toBeNull()
  })

  it("blocks direct anon inserts on notes", async () => {
    const { error } = await anon.from("notes").insert({
      public_id: "hacked1",
      content: { type: "doc", content: [] },
    })
    expect(error).not.toBeNull()
  })

  it("blocks direct anon updates on notes", async () => {
    const { error } = await anon
      .from("notes")
      .update({ title: "hacked" })
      .eq("public_id", createdPublicIds[0])
    expect(error).not.toBeNull()
  })
})

d("verify_edit_code and lockout", () => {
  it("rejects a wrong code and counts attempts", async () => {
    const code = testCode()
    const { data: publicId, error: createError } = await anon.rpc(
      "create_guest_note",
      {
        p_title: "lockout note",
        p_content: { type: "doc", content: [] },
        p_content_format: "tiptap_json",
        p_editing_policy: "edit_code",
        p_edit_code: code,
        p_expires_at: null,
        p_visibility: "public",
      }
    )
    expect(createError).toBeNull()
    createdPublicIds.push(publicId as string)

    const ipHash = testIpHash()
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data, error } = await anon.rpc("verify_edit_code", {
        p_public_id: publicId as string,
        p_code: "WRONG!",
        p_token: randomBytes(32).toString("base64url"),
        p_ip_hash: ipHash,
      })
      expect(error).toBeNull()
      expect((data as { status: string }).status).toBe("invalid_code")
    }
    // 9th attempt: the 15-minute per-note lockout is active.
    const { data: lockedData } = await anon.rpc("verify_edit_code", {
      p_public_id: publicId as string,
      p_code: "WRONG!",
      p_token: randomBytes(32).toString("base64url"),
      p_ip_hash: ipHash,
    })
    expect((lockedData as { status: string }).status).toBe("locked")
  })

  it("issues a session for the correct code and allows an authorized save", async () => {
    const code = testCode()
    const { data: publicId, error: createError } = await anon.rpc(
      "create_guest_note",
      {
        p_title: "session note",
        p_content: { type: "doc", content: [] },
        p_content_format: "tiptap_json",
        p_editing_policy: "edit_code",
        p_edit_code: code,
        p_expires_at: null,
        p_visibility: "public",
      }
    )
    expect(createError).toBeNull()
    createdPublicIds.push(publicId as string)

    // Saving without a session is rejected.
    const { error: noSessionError } = await anon.rpc("save_note", {
      p_public_id: publicId as string,
      p_title: "nope",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_token: null,
    })
    expect(noSessionError?.message).toContain("EDIT_SESSION_REQUIRED")

    const token = randomBytes(32).toString("base64url")
    const { data: verifyData, error: verifyError } = await anon.rpc(
      "verify_edit_code",
      {
        p_public_id: publicId as string,
        p_code: code,
        p_token: token,
        p_ip_hash: testIpHash(),
      }
    )
    expect(verifyError).toBeNull()
    expect((verifyData as { status: string }).status).toBe("ok")
    expect((verifyData as { expires_at?: string }).expires_at).toBeTruthy()

    const { data: revisionNo, error: saveError } = await anon.rpc("save_note", {
      p_public_id: publicId as string,
      p_title: "saved!",
      p_content: { type: "doc", content: [{ type: "paragraph" }] },
      p_content_format: "tiptap_json",
      p_token: token,
    })
    expect(saveError).toBeNull()
    expect(revisionNo).toBe(1)

    // An invalid token cannot save.
    const { error: badTokenError } = await anon.rpc("save_note", {
      p_public_id: publicId as string,
      p_title: "nope",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_token: randomBytes(32).toString("base64url"),
    })
    expect(badTokenError?.message).toContain("EDIT_SESSION_EXPIRED")
  })

  it("refuses verification on read_only notes", async () => {
    const { data: publicId, error: createError } = await anon.rpc(
      "create_guest_note",
      {
        p_title: "readonly note",
        p_content: { type: "doc", content: [] },
        p_content_format: "tiptap_json",
        p_editing_policy: "read_only",
        p_edit_code: null,
        p_expires_at: null,
        p_visibility: "public",
      }
    )
    expect(createError).toBeNull()
    createdPublicIds.push(publicId as string)

    const { data } = await anon.rpc("verify_edit_code", {
      p_public_id: publicId as string,
      p_code: testCode(),
      p_token: randomBytes(32).toString("base64url"),
      p_ip_hash: testIpHash(),
    })
    expect((data as { status: string }).status).toBe("invalid_code")
  })
})

d("rate limit store", () => {
  it("counts up to the limit then blocks", async () => {
    const key = `test:${randomBytes(8).toString("hex")}`
    for (let i = 0; i < 3; i += 1) {
      const { data } = await anon.rpc("consume_rate_limit", {
        p_key: key,
        p_limit: 3,
        p_window_seconds: 60,
      })
      expect(data).toBe(true)
    }
    const { data: blocked } = await anon.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: 3,
      p_window_seconds: 60,
    })
    expect(blocked).toBe(false)
  })
})

afterAll(async () => {
  if (!service || createdPublicIds.length === 0) {
    return
  }
  await service.from("notes").delete().in("public_id", createdPublicIds)
})
