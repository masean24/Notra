import { notFound } from "next/navigation"
import { headers } from "next/headers"

import { AdminPanel } from "./admin-panel"
import { getAdminUser } from "@/lib/admin/guard"

export const metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
}

/**
 * Direct visits to /internal-admin render the standard 404 (SPEC §14) — the
 * proxy only tags requests rewritten from the operator's ADMIN_SECRET_PATH
 * with a header carrying that secret value, which a client cannot spoof
 * without knowing it. Even a correctly-tagged request must additionally be
 * a verified admin (profiles.is_admin, re-checked server-side on every
 * request). Anything else is an identical 404: no oracle.
 */
export default async function InternalAdminPage() {
  const requestHeaders = await headers()
  const secret = process.env.ADMIN_SECRET_PATH
  const entryHeader = requestHeaders.get("x-notra-admin-entry")

  if (!secret || !secret.startsWith("/") || entryHeader !== secret) {
    notFound()
  }

  const admin = await getAdminUser()
  if (!admin) {
    notFound()
  }

  return <AdminPanel />
}
