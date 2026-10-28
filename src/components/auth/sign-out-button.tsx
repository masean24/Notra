"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client"

export function SignOutButton({
  className,
  size = "sm",
  iconOnly = false,
}: {
  className?: string
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  iconOnly?: boolean
}) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (!isSupabaseConfigured()) {
      return
    }
    setSigningOut(true)
    try {
      await getSupabaseBrowserClient().auth.signOut()
      router.push("/")
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleSignOut}
      disabled={signingOut}
      aria-label="Sign out"
      title="Sign out"
      className={className}
    >
      <LogOut className="size-3.5" aria-hidden />
      {!iconOnly ? (
        <span>{signingOut ? "Signing out…" : "Sign out"}</span>
      ) : null}
    </Button>
  )
}
