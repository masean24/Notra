"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { Button } from "@/components/ui/button"
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client"

/**
 * Session-aware auth actions for the landing header. Renders the guest
 * buttons by default (SSR-safe) and swaps in Dashboard + Sign out once a
 * browser session is detected.
 */
export function AuthNav() {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
  }, [])

  if (signedIn) {
    return (
      <>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Dashboard
        </Button>
        <SignOutButton />
      </>
    )
  }

  return (
    <>
      <Button variant="ghost" render={<Link href="/login" />}>
        Sign in
      </Button>
      <Button variant="outline" render={<Link href="/signup" />}>
        Sign up
      </Button>
    </>
  )
}
