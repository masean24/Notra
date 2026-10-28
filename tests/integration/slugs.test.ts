import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import { RESERVED_SLUGS, isValidSlug } from "@/config/slugs"
import { claimSlugSchema } from "@/lib/validation/notes"
import { hasSupabaseEnv } from "../setup"

/**
 * Integration tests for the Phase 5 RPCs (claim_slug, get_note_by_slug)
 * against the real Supabase project. Skips with a clear message when
 * migration 0006 has not been applied yet.
 */
const d = describe.runIf(hasSupabaseEnv)

let anon: SupabaseClient<Database>
let service: SupabaseClient<Database> | null
const createdPublicIds: string[] = []
const createdUserIds: string[] = []

let rpcsAvailable: boolean | null = null

// Auth endpoints are heavily rate-limited: memoize one "owner" and one
// "other" test user per file instead of creating fresh users per test.
const testUsers = new Map<string, { userId: string; client: SupabaseClient<Database> }>()
async function getUser(role: "owner" | "other") {
  const cached = testUsers.get(role)
  if (cached) {
    return cached
  }
  const created = await createSignedInUser()
  testUsers.set(role, created)
  return created
}

async function ensureMigrated(ctx: TestContext): Promise<void> {
  if (rpcsAvailable === null) {
    const { error } = await anon.rpc("get_note_by_slug", { p_slug: "probe" })
    rpcsAvailable = !(error && error.code === "PGRST202")
  }
  ctx.skip(!rpcsAvailable, "Migration 0006 not applied yet — apply supabase/migrations/20260902000005_slugs_seo.sql to the Supabase project.")
}

async function createSignedInUser(): Promise<{
  userId: string
  client: SupabaseClient<Database>
}> {
  if (!service) {
    throw new Error("service client unavailable")
  }
  const email = `phase5-${randomBytes(6).toString("hex")}@notra.test`
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
  visibility = "public"
): Promise<string> {
  const { data: publicId, error } = await client.rpc("create_user_note", {
    p_title: "slug note",
    p_content: { type: "doc", content: [] },
    p_content_format: "tiptap_json",
    p_expires_at: null,
    p_visibility: visibility,
  })
  expect(error).toBeNull()
  createdPublicIds.push(publicId as string)
  return publicId as string
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

describe("slug validation helpers", () => {
  it("accepts valid slugs and rejects malformed ones", () => {
    expect(isValidSlug("my-pitch-deck")).toBe(true)
    expect(isValidSlug("abc")).toBe(true)
    expect(isValidSlug("ab")).toBe(false)
    expect(isValidSlug("-lead")).toBe(false)
    expect(isValidSlug("trail-")).toBe(false)
    expect(isValidSlug("has space")).toBe(false)
    expect(isValidSlug("Ünïcode")).toBe(false)
    expect(isValidSlug("a".repeat(64))).toBe(false)
  })

  it("keeps system routes reserved", () => {
    for (const reserved of ["new", "login", "dashboard", "api", "n", "s"]) {
      expect(RESERVED_SLUGS.has(reserved)).toBe(true)
    }
  })

  it("claimSlugSchema mirrors the format check", () => {
    expect(claimSlugSchema.safeParse({ slug: "valid-slug" }).success).toBe(true)
    expect(claimSlugSchema.safeParse({ slug: "-bad" }).success).toBe(false)
    expect(claimSlugSchema.safeParse({ slug: "x" }).success).toBe(false)
  })
})

d("claim_slug RPC", () => {
  it("claims a slug, re-claims it, and exposes the public note", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await getUser("owner")
    const publicId = await createOwnedNote(client)
    const slug = `note-${randomBytes(4).toString("hex")}`

    const { data: claimed } = await client.rpc("claim_slug", {
      p_public_id: publicId,
      p_slug: slug,
    })
    expect((claimed as { status: string }).status).toBe("ok")
    expect((claimed as { slug: string }).slug).toBe(slug)

    // Re-claiming the same slug for the same note is idempotent.
    const { data: again } = await client.rpc("claim_slug", {
      p_public_id: publicId,
      p_slug: slug,
    })
    expect((again as { status: string }).status).toBe("ok")

    const { data: resolved } = await anon.rpc("get_note_by_slug", {
      p_slug: slug,
    })
    expect((resolved as { status: string }).status).toBe("ok")
    expect((resolved as { public_id: string }).public_id).toBe(publicId)

    const { data: stored } = await service!
      .from("notes")
      .select("custom_slug")
      .eq("public_id", publicId)
      .single()
    expect(stored?.custom_slug).toBe(slug)
  })

  it("rejects reserved, malformed, and taken slugs", async (ctx) => {
    await ensureMigrated(ctx)
    const { client } = await getUser("owner")
    const publicId = await createOwnedNote(client)

    const { data: reserved } = await client.rpc("claim_slug", {
      p_public_id: publicId,
      p_slug: "dashboard",
    })
    expect((reserved as { status: string }).status).toBe("reserved_slug")

    const { data: malformed } = await client.rpc("claim_slug", {
      p_public_id: publicId,
      p_slug: "Bad Slug!",
    })
    expect((malformed as { status: string }).status).toBe("invalid_slug")

    const slug = `taken-${randomBytes(4).toString("hex")}`
    const { client: otherOwner } = await getUser("other")
    const otherNote = await createOwnedNote(otherOwner)
    const { data: firstClaim } = await otherOwner.rpc("claim_slug", {
      p_public_id: otherNote,
      p_slug: slug,
    })
    expect((firstClaim as { status: string }).status).toBe("ok")

    const { data: taken } = await client.rpc("claim_slug", {
      p_public_id: publicId,
      p_slug: slug,
    })
    expect((taken as { status: string }).status).toBe("slug_taken")
  })

  it("refuses non-owners and reports private notes as not_found", async (ctx) => {
    await ensureMigrated(ctx)
    const { client: ownerClient } = await getUser("owner")
    const publicId = await createOwnedNote(ownerClient)
    const { client: otherClient } = await getUser("other")

    const { data: hijack } = await otherClient.rpc("claim_slug", {
      p_public_id: publicId,
      p_slug: "hijacked-slug",
    })
    expect((hijack as { status: string }).status).toBe("note_not_found")

    // Make the note private: the slug must resolve to not_found for guests.
    await ownerClient.rpc("claim_slug", {
      p_public_id: publicId,
      p_slug: "private-probe",
    })
    await service!
      .from("notes")
      .update({ visibility: "private" })
      .eq("public_id", publicId)
    const { data: resolved } = await anon.rpc("get_note_by_slug", {
      p_slug: "private-probe",
    })
    expect((resolved as { status: string }).status).toBe("not_found")
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
