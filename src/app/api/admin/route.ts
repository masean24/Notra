import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { getAdminUser } from "@/lib/admin/guard"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"

/**
 * Admin panel data (SPEC §14/§27 Phase 9). Every handler re-checks
 * profiles.is_admin server-side; the RPCs themselves re-assert is_admin and
 * write the audit trail, so this route adds only envelope mapping and
 * pagination clamping.
 */

const MAX_LIMIT = 200

function clampLimit(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 50
  }
  return Math.min(Math.floor(parsed), MAX_LIMIT)
}

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) {
    return errorResponse(
      404,
      "NOT_FOUND",
      "The page you are looking for does not exist."
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) {
    return denied
  }

  const supabase = await createClient()
  const resource = request.nextUrl.searchParams.get("resource") ?? "stats"
  const limit = clampLimit(request.nextUrl.searchParams.get("limit"))

  switch (resource) {
    case "stats": {
      const { data, error } = await supabase.rpc("admin_stats")
      if (error) {
        return errorResponse(500, "INTERNAL_ERROR", "Could not load admin stats.")
      }
      return successResponse(data)
    }
    case "users": {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_limit: limit,
      })
      if (error) {
        return errorResponse(500, "INTERNAL_ERROR", "Could not load users.")
      }
      return successResponse(data)
    }
    case "notes": {
      const { data, error } = await supabase.rpc("admin_list_notes", {
        p_limit: limit,
      })
      if (error) {
        return errorResponse(500, "INTERNAL_ERROR", "Could not load notes.")
      }
      return successResponse(data)
    }
    case "audit": {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, admin_id, action, target_id, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) {
        return errorResponse(500, "INTERNAL_ERROR", "Could not load audit log.")
      }
      return successResponse(data)
    }
    case "probes": {
      const { data, error } = await supabase
        .from("admin_probe_log")
        .select("id, ip_hash, path, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) {
        return errorResponse(500, "INTERNAL_ERROR", "Could not load probe log.")
      }
      return successResponse(data)
    }
    default:
      return errorResponse(400, "VALIDATION_ERROR", "Unknown admin resource.")
  }
}

export async function POST(request: NextRequest) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }
  const denied = await requireAdmin()
  if (denied) {
    return denied
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }

  const body = payload as { action?: string; publicId?: string; deleted?: boolean }
  if (
    (body.action !== "set_note_deleted" && body.action !== "clear_lockout") ||
    typeof body.publicId !== "string" ||
    body.publicId.length === 0 ||
    body.publicId.length > 64
  ) {
    return errorResponse(400, "VALIDATION_ERROR", "Invalid admin action.")
  }
  if (body.action === "set_note_deleted" && typeof body.deleted !== "boolean") {
    return errorResponse(400, "VALIDATION_ERROR", "Missing deletion flag.")
  }

  const supabase = await createClient()
  const { data, error } =
    body.action === "set_note_deleted"
      ? await supabase.rpc("admin_set_note_deleted", {
          p_public_id: body.publicId,
          p_deleted: body.deleted as boolean,
        })
      : await supabase.rpc("admin_clear_lockout", {
          p_public_id: body.publicId,
        })
  if (error) {
    return errorResponse(500, "INTERNAL_ERROR", "The admin action failed.")
  }
  const status = (data as { status?: string } | null)?.status
  if (status === "note_not_found") {
    return errorResponse(404, "NOT_FOUND", "That note does not exist.")
  }
  if (status !== "ok") {
    return errorResponse(500, "INTERNAL_ERROR", "The admin action failed.")
  }
  return successResponse({ ok: true })
}
