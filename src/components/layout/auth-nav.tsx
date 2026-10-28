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
export function AuthNav({ isMobile = false }: { isMobile?: boolean }) {
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
    if (isMobile) {
      return (
        <div className="flex w-full items-center gap-2">
          <Button
            variant="outline"
            render={<Link href="/dashboard" />}
            className="h-10 flex-1 justify-center text-sm font-medium"
          >
            Dashboard
          </Button>
          <SignOutButton
            size="default"
            className="h-10 px-4 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          />
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/dashboard" />}
          className="h-8 px-3 text-xs font-medium border-border/70 hover:bg-muted/60"
        >
          Dashboard
        </Button>
        <SignOutButton
          iconOnly
          size="icon"
          className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        />
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="flex w-full items-center gap-2">
        <Button
          variant="outline"
          render={<Link href="/login" />}
          className="h-10 flex-1 justify-center text-sm font-medium"
        >
          Sign in
        </Button>
        <Button
          variant="secondary"
          render={<Link href="/signup" />}
          className="h-10 flex-1 justify-center text-sm font-medium"
        >
          Sign up
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/login" />}
        className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Sign in
      </Button>
    </div>
  )
}
