"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client"

export function SignOutButton() {
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
      size="sm"
      onClick={handleSignOut}
      disabled={signingOut}
    >
      <LogOut className="size-4" aria-hidden />
      {signingOut ? "Signing out…" : "Sign out"}
    </Button>
  )
}
