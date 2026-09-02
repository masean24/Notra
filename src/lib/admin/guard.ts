import { createClient } from "@/lib/supabase/server"

/**
 * Server-side admin gate (SPEC §14/§27 Phase 9). Never trusts the presence
 * of a route or path — every caller re-verifies the session and
 * profiles.is_admin on the server, per request. Returns null for anonymous
 * users, authenticated non-admins, or any lookup failure (fail closed).
 */
export async function getAdminUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return null
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (error || !data?.is_admin) {
    return null
  }
  return { id: user.id }
}
