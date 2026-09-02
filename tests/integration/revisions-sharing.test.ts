import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import { hasSupabaseEnv } from "../setup"

/**
 * Integration tests for the Phase 4 RPCs (restore_revision, share links,
 * get_public_note, redeem_share) against the real Supabase project. Skipped
 * without env vars, or with a clear message when migration 0005 has not
 * been applied yet (PGRST202 = function missing from the schema cache).
 */
const d = describe.runIf(hasSupabaseEnv)

let anon: SupabaseClient<Database>
let service: SupabaseClient<Database> | null
const createdPublicIds: string[] = []
const createdUserIds: string[] = []

let rpcsAvailable: boolean | null = null

async function ensureMigrated(ctx: TestContext): Promise<void> {
  if (rpcsAvailable === null) {
    const { error } = await anon.rpc("get_public_note", {
      p_public_id: "probe000",
    })
    rpcsAvailable = !(error && error.code === "PGRST202")
  }
  ctx.skip(!rpcsAvailable, "Migration 0005 not applied yet — apply supabase/migrations/20260902000004_revisions_sharing_expiration.sql to the Supabase project.")
}

async function createSignedInUser(): Promise<{
  userId: string
  client: SupabaseClient<Database>
}> {
  if (!service) {
    throw new Error("service client unavailable")
  }
  const email = `phase4-${randomBytes(6).toString("hex")}@opennotepad.test`
  const password = `pw-${randomBytes(12).toString("hex")}`
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

async function createOwnedNote(
  client: SupabaseClient<Database>,
  title: string,
  visibility = "public"
): Promise<string> {
  const { data: publicId, error } = await client.rpc("create_user_note", {
    p_title: title,
    p_content: { type: "doc", content: [{ type: "paragraph" }] },
    p_content_format: "tiptap_json",
    p_expires_at: null,
    p_visibility: visibility,
  })
  expect(error).toBeNull()
  createdPublicIds.push(publicId as string)
  return publicId as string
}

function docFor(text: string): Record<string, unknown> {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  }
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

d("restore_revision RPC", () => {
  it("rolls content back and records the rollback as a new revision", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await createSignedInUser()
    const publicId = await createOwnedNote(client, "original")

    const { data: rev1 } = await client.rpc("save_note", {
      p_public_id: publicId,
      p_title: "v1",
      p_content: docFor("version one"),
      p_content_format: "tiptap_json",
      p_token: null,
    })
    expect(rev1).toBe(1)
    const { data: rev2 } = await client.rpc("save_note", {
      p_public_id: publicId,
      p_title: "v2",
      p_content: docFor("version two"),
      p_content_format: "tiptap_json",
      p_token: null,
    })
    expect(rev2).toBe(2)

    const { data: restoredRev, error } = await client.rpc("restore_revision", {
      p_public_id: publicId,
      p_revision_no: 1,
    })
    expect(error).toBeNull()
    expect(restoredRev).toBe(3)

    const { data: note } = await service!
      .from("notes")
      .select("title, revision_no")
      .eq("public_id", publicId)
      .single()
    expect(note?.title).toBe("v1")
    expect(note?.revision_no).toBe(3)

    // The rollback itself is revision #3 in history.
    const { data: revisions } = await client
      .from("note_revisions")
      .select("revision_no, title")
      .order("revision_no")
    const numbers = (revisions ?? []).map(
      (r: { revision_no: number }) => r.revision_no
    )
    expect(numbers).toEqual([0, 1, 2, 3])
  })

  it("refuses a non-owner", async (ctx) => {
    await ensureMigrated(ctx)
    const { client: ownerClient } = await createSignedInUser()
    const publicId = await createOwnedNote(ownerClient, "not yours")
    const { client: otherClient } = await createSignedInUser()
    const { error } = await otherClient.rpc("restore_revision", {
      p_public_id: publicId,
      p_revision_no: 0,
    })
    expect(error?.message).toContain("NOTE_NOT_FOUND")
  })

  it("refuses an unknown revision", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await createSignedInUser()
    const publicId = await createOwnedNote(client, "no such revision")
    const { error } = await client.rpc("restore_revision", {
      p_public_id: publicId,
      p_revision_no: 999,
    })
    expect(error?.message).toContain("REVISION_NOT_FOUND")
  })
})

d("get_public_note RPC", () => {
  it("returns ok for a public note", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await createSignedInUser()
    const publicId = await createOwnedNote(client, "public probe")
    const { data } = await anon.rpc("get_public_note", {
      p_public_id: publicId,
    })
    const payload = data as { status: string; title?: string }
    expect(payload.status).toBe("ok")
    expect(payload.title).toBe("public probe")
  })

  it("reports expired for an expired public note", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await createSignedInUser()
    const publicId = await createOwnedNote(client, "expiring probe")
    await service!
      .from("notes")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("public_id", publicId)
    const { data } = await anon.rpc("get_public_note", {
      p_public_id: publicId,
    })
    expect((data as { status: string }).status).toBe("expired")
  })

  it("hides private notes as not_found", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await createSignedInUser()
    const publicId = await createOwnedNote(client, "private probe", "private")
    const { data } = await anon.rpc("get_public_note", {
      p_public_id: publicId,
    })
    expect((data as { status: string }).status).toBe("not_found")
  })
})

d("share links", () => {
  it("mints a view share that redeems without an edit session", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await createSignedInUser()
    const publicId = await createOwnedNote(client, "share view")

    const { data: minted, error: mintError } = await client.rpc(
      "create_share_link",
      {
        p_public_id: publicId,
        p_permission: "view",
        p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
    )
    expect(mintError).toBeNull()
    const token = (minted as { token: string }).token

    const { data: redeemed } = await anon.rpc("redeem_share", {
      p_token: token,
      p_session_token: randomBytes(32).toString("base64url"),
    })
    const payload = redeemed as {
      status: string
      permission: string
      public_id: string
      session_expires_at: string | null
    }
    expect(payload.status).toBe("ok")
    expect(payload.permission).toBe("view")
    expect(payload.public_id).toBe(publicId)
    expect(payload.session_expires_at).toBeNull()
  })

  it("mints an edit share whose session authorizes a save", async (ctx) => {
    await ensureMigrated(ctx)
    const { client: ownerClient } = await createSignedInUser()
    const publicId = await createOwnedNote(ownerClient, "share edit")

    const { data: minted } = await ownerClient.rpc("create_share_link", {
      p_public_id: publicId,
      p_permission: "edit",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    const token = (minted as { token: string }).token

    const sessionToken = randomBytes(32).toString("base64url")
    const { data: redeemed } = await anon.rpc("redeem_share", {
      p_token: token,
      p_session_token: sessionToken,
    })
    expect((redeemed as { status: string }).status).toBe("ok")
    expect((redeemed as { permission: string }).permission).toBe("edit")
    expect((redeemed as { session_expires_at: string }).session_expires_at).toBeTruthy()

    // The minted session authorizes a save from an anonymous client.
    const { error: saveError } = await anon.rpc("save_note", {
      p_public_id: publicId,
      p_title: "edited via share",
      p_content: docFor("shared edit"),
      p_content_format: "tiptap_json",
      p_token: sessionToken,
    })
    expect(saveError).toBeNull()
  })

  it("refuses bad tokens and revokes existing ones", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await createSignedInUser()
    const publicId = await createOwnedNote(client, "revoke target")

    const { data: minted } = await client.rpc("create_share_link", {
      p_public_id: publicId,
      p_permission: "view",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    const token = (minted as { token: string }).token
    const shareId = (minted as { share_id: string }).share_id

    // Unknown token — same response as a revoked one.
    const { data: bad } = await anon.rpc("redeem_share", {
      p_token: randomBytes(32).toString("hex"),
      p_session_token: randomBytes(32).toString("base64url"),
    })
    expect((bad as { status: string }).status).toBe("not_found")

    // List shows metadata only, never the token or its hash.
    const { data: listed } = await client.rpc("list_share_links", {
      p_public_id: publicId,
    })
    const rows = listed as Array<Record<string, unknown>>
    expect(rows).toHaveLength(1)
    expect(Object.keys(rows[0] ?? {})).not.toContain("token")
    expect(Object.keys(rows[0] ?? {})).not.toContain("token_hash")

    // Revoke by id, then redemption is refused.
    const { data: revoked } = await client.rpc("revoke_share_link", {
      p_public_id: publicId,
      p_share_id: shareId,
    })
    expect(revoked).toBe(true)
    const { data: afterRevoke } = await anon.rpc("redeem_share", {
      p_token: token,
      p_session_token: randomBytes(32).toString("base64url"),
    })
    expect((afterRevoke as { status: string }).status).toBe("not_found")
  })

  it("rejects invalid permission, past expiry, and non-owners", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await createSignedInUser()
    const publicId = await createOwnedNote(client, "mint guards")

    const { error: permError } = await client.rpc("create_share_link", {
      p_public_id: publicId,
      p_permission: "admin",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    expect(permError?.message).toContain("INVALID_SHARE_PERMISSION")

    const { error: expiryError } = await client.rpc("create_share_link", {
      p_public_id: publicId,
      p_permission: "view",
      p_expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    expect(expiryError?.message).toContain("INVALID_SHARE_EXPIRY")

    const { client: otherClient } = await createSignedInUser()
    const { error: ownerError } = await otherClient.rpc("create_share_link", {
      p_public_id: publicId,
      p_permission: "view",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    expect(ownerError?.message).toContain("NOTE_NOT_FOUND")
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
