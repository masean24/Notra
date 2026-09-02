import type { Metadata } from "next"

import { AdminDecoy } from "./admin-decoy"

export const metadata: Metadata = {
  title: "Admin",
  // The decoy is a public joke page; keep it out of search results.
  robots: { index: false, follow: false },
}

/**
 * The decoy /admin (SPEC §14). Renders for everyone; there is nothing to
 * gain here. The punchline is randomized client-side after mount.
 */
export default function AdminDecoyPage() {
  return <AdminDecoy />
}
