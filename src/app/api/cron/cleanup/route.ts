import { NextResponse, type NextRequest } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { errorResponse, successResponse } from "@/lib/api/response"

/**
 * Scheduled cleanup job route handler (SPEC §9, docs/scheduled-cleanup.md).
 *
 * Intended to be called by Vercel Cron or a self-hosted scheduler (system cron, Docker).
 * Protected by CRON_SECRET (Authorization: Bearer <secret> or header x-cron-secret).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return errorResponse(
      503,
      "CRON_UNCONFIGURED",
      "CRON_SECRET is not configured on the server."
    )
  }

  // Authorize via Bearer token or x-cron-secret header
  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null

  if (bearerToken !== secret && cronHeader !== secret) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid or missing cron secret.")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse(
      500,
      "CONFIG_ERROR",
      "SUPABASE_SERVICE_ROLE_KEY is required to run the cleanup job."
    )
  }

  // Create admin client with service_role key to invoke cleanup_expired_notes
  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await adminClient.rpc("cleanup_expired_notes")
  if (error) {
    console.error("Cleanup cron failed:", error.message)
    return errorResponse(
      500,
      "CLEANUP_FAILED",
      "Could not execute database cleanup function."
    )
  }

  return successResponse(data)
}

/** Allow GET for straightforward curl testing with token query or header */
export async function GET(request: NextRequest) {
  return POST(request)
}
