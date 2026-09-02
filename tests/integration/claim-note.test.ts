import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import { hasSupabaseEnv } from "../setup"

/**
 * Integration tests for the Phase 3 SECURITY DEFINER RPCs
 * (create_user_note, claim_note) and the owner RLS grants, against the real
 * Supabase project. Skipped without Supabase env vars. If the Phase 3
 * migration (0004) has not been applied yet, the suite skips itself with a
 * clear message instead of failing — the RPCs simply do not exist yet.
 */
const d = describe.runIf(hasSupabaseEnv)

let anon: SupabaseClient<Database>
let service: SupabaseClient<Database> | null
const createdPublicIds: string[] = []
const createdUserIds: string[] = []

let rpcsAvailable: boolean | null = null

function testEmail(): string {
  return `phase3-${randomBytes(6).toString("hex")}@opennotepad.test`
}

function testPassword(): string {
  return `pw-${randomBytes(12).toString("hex")}`
}

async function createSignedInUser(): Promise<{
  userId: string
  client: SupabaseClient<Database>
}> {
  if (!service) {
    throw new Error("service client unavailable")
  }
  const email = testEmail()
  const password = testPassword()
  const { data: created, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !created.user) {
    throw new Error(`could not create test user: ${error?.message}`)
  }
  createdUserIds.push(created.user.id)

  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) {
    throw new Error(`could not sign in test user: ${signInError.message}`)
  }
  return { userId: created.user.id, client }
}

/**
 * Probe for migration 0004. When the RPCs are missing (PostgREST returns
 * PGRST202 "could not find the function"), skip the tests honestly: the code
 * is fine, the live database just needs the migration applied.
 */
async function ensureMigrated(ctx: TestContext): Promise<void> {
  if (rpcsAvailable === null) {
    const { error } = await anon.rpc("claim_note", {
      p_public_id: "probe000",
      p_code: "probe",
    })
    rpcsAvailable = !(error && error.code === "PGRST202")
  }
  ctx.skip(!rpcsAvailable, "Migration 0004 not applied yet — apply supabase/migrations/20260902000003_accounts_dashboard.sql to the Supabase project.")
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

d("create_user_note RPC", () => {
  it("creates a note owned by the signed-in user", async (ctx) => {
    await ensureMigrated(ctx)
    const { userId, client } = await createSignedInUser()

    const { data: publicId, error } = await client.rpc("create_user_note", {
      p_title: "Owned note",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_expires_at: null,
      p_visibility: "public",
    })
    expect(error).toBeNull()
    expect(publicId).toMatch(/^[A-Za-z0-9]{7}$/)
    createdPublicIds.push(publicId as string)

    const { data: note } = await service!
      .from("notes")
      .select("owner_id, editing_policy, edit_code_hash")
      .eq("public_id", publicId as string)
      .single()
    expect(note?.owner_id).toBe(userId)
    // Owned notes never need an edit code — no policy/authorization shortcut.
    expect(note?.editing_policy).toBe("account")
    expect(note?.edit_code_hash).toBeNull()
  })

  it("is refused for anonymous callers", async (ctx) => {
    await ensureMigrated(ctx)
    const { error } = await anon.rpc("create_user_note", {
      p_title: "anon",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_expires_at: null,
      p_visibility: "public",
    })
    expect(error?.message).toContain("UNAUTHENTICATED")
  })
})

d("claim_note RPC", () => {
  it("claims a guest note with the correct edit code and keeps the link", async (ctx) => {
    await ensureMigrated(ctx)
    const code = `claim-${randomBytes(4).toString("hex")}`
    const { data: publicId, error: createError } = await anon.rpc(
      "create_guest_note",
      {
        p_title: "claim me",
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

    const { userId, client } = await createSignedInUser()

    const { data: claimed } = await client.rpc("claim_note", {
      p_public_id: publicId as string,
      p_code: code,
    })
    expect((claimed as { status: string }).status).toBe("ok")
    expect((claimed as { public_id?: string }).public_id).toBe(publicId as string)

    const { data: note } = await service!
      .from("notes")
      .select("owner_id, public_id")
      .eq("public_id", publicId as string)
      .single()
    expect(note?.owner_id).toBe(userId)
    // The note and its public link are never recreated.
    expect(note?.public_id).toBe(publicId as string)

    // The owner can now read the note through RLS.
    const { data: ownRow, error: ownError } = await client
      .from("notes")
      .select("public_id, owner_id")
      .eq("public_id", publicId as string)
      .single()
    expect(ownError).toBeNull()
    expect(ownRow?.owner_id).toBe(userId)
  })

  it("rejects a wrong code without revealing why", async (ctx) => {
    await ensureMigrated(ctx)
    const { data: publicId } = await anon.rpc("create_guest_note", {
      p_title: "wrong code note",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_editing_policy: "edit_code",
      p_edit_code: `wrong-${randomBytes(4).toString("hex")}`,
      p_expires_at: null,
      p_visibility: "public",
    })
    createdPublicIds.push(publicId as string)

    const { client } = await createSignedInUser()
    const { data } = await client.rpc("claim_note", {
      p_public_id: publicId as string,
      p_code: "definitely-wrong-code",
    })
    expect((data as { status: string }).status).toBe("invalid_code")
  })

  it("locks out after 8 failed claim attempts per user", async (ctx) => {
    await ensureMigrated(ctx)
    const { data: publicId } = await anon.rpc("create_guest_note", {
      p_title: "lockout note",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_editing_policy: "edit_code",
      p_edit_code: `lock-${randomBytes(4).toString("hex")}`,
      p_expires_at: null,
      p_visibility: "public",
    })
    createdPublicIds.push(publicId as string)

    const { client } = await createSignedInUser()
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data } = await client.rpc("claim_note", {
        p_public_id: publicId as string,
        p_code: "nope-nope-nope",
      })
      expect((data as { status: string }).status).toBe("invalid_code")
    }
    const { data: locked } = await client.rpc("claim_note", {
      p_public_id: publicId as string,
      p_code: "nope-nope-nope",
    })
    expect((locked as { status: string }).status).toBe("locked")
  })

  it("refuses to claim a note already owned by another account", async (ctx) => {
    await ensureMigrated(ctx)
    const code = `taken-${randomBytes(4).toString("hex")}`
    const { data: publicId } = await anon.rpc("create_guest_note", {
      p_title: "already taken",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_editing_policy: "edit_code",
      p_edit_code: code,
      p_expires_at: null,
      p_visibility: "public",
    })
    createdPublicIds.push(publicId as string)

    const { client: ownerClient } = await createSignedInUser()
    const { data: firstClaim } = await ownerClient.rpc("claim_note", {
      p_public_id: publicId as string,
      p_code: code,
    })
    expect((firstClaim as { status: string }).status).toBe("ok")

    const { client: otherClient } = await createSignedInUser()
    const { data: secondClaim } = await otherClient.rpc("claim_note", {
      p_public_id: publicId as string,
      p_code: code,
    })
    expect((secondClaim as { status: string }).status).toBe("already_claimed")
  })
})

d("owner RLS grants", () => {
  it("blocks cross-owner updates between authenticated users", async (ctx) => {
    await ensureMigrated(ctx)
    const { client: ownerClient } = await createSignedInUser()
    const { data: ownedId } = await ownerClient.rpc("create_user_note", {
      p_title: "do not touch",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_expires_at: null,
      p_visibility: "public",
    })
    createdPublicIds.push(ownedId as string)

    const { client: otherClient } = await createSignedInUser()
    // RLS notes_update_own scopes the UPDATE to zero rows — no error, but
    // nothing changes either.
    const { error } = await otherClient
      .from("notes")
      .update({ title: "hijacked" })
      .eq("public_id", ownedId as string)
    expect(error).toBeNull()

    const { data: note } = await service!
      .from("notes")
      .select("title")
      .eq("public_id", ownedId as string)
      .single()
    expect(note?.title).toBe("do not touch")
  })

  it("blocks cross-owner deletes between authenticated users", async (ctx) => {
    await ensureMigrated(ctx)
    const { client: ownerClient } = await createSignedInUser()
    const { data: ownedId } = await ownerClient.rpc("create_user_note", {
      p_title: "still here",
      p_content: { type: "doc", content: [] },
      p_content_format: "tiptap_json",
      p_expires_at: null,
      p_visibility: "public",
    })
    createdPublicIds.push(ownedId as string)

    const { client: otherClient } = await createSignedInUser()
    const { error } = await otherClient
      .from("notes")
      .delete()
      .eq("public_id", ownedId as string)
    expect(error).toBeNull()

    const { data: note } = await service!
      .from("notes")
      .select("public_id")
      .eq("public_id", ownedId as string)
      .maybeSingle()
    expect(note).not.toBeNull()
  })
})

afterAll(async () => {
  if (!service) {
    return
  }
  if (createdPublicIds.length > 0) {
    await service.from("notes").delete().in("public_id", createdPublicIds)
  }
  for (const userId of createdUserIds) {
    await service.auth.admin.deleteUser(userId)
  }
})
