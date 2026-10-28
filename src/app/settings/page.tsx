import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { LayoutDashboard, UserRound } from "lucide-react"
import { NotraMark } from "@/components/brand/notra-logo"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { ClaimNoteForm } from "@/components/settings/claim-note-form"
import { GeminiKeyCard } from "@/components/settings/gemini-key-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?next=/settings")
  }

  // RLS "profiles_select_own" guarantees only the caller's profile returns.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, created_at")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
          aria-label="Notra home"
        >
          <NotraMark className="size-4" />
          Notra
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
            <LayoutDashboard className="size-4" aria-hidden />
            Dashboard
          </Button>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4" aria-hidden />
              Profile
            </CardTitle>
            <CardDescription>Your account details.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Email: </span>
              {user.email ?? "—"}
            </p>
            {profile?.display_name ? (
              <p>
                <span className="text-muted-foreground">Display name: </span>
                {profile.display_name}
              </p>
            ) : null}
            {profile?.created_at ? (
              <p>
                <span className="text-muted-foreground">Member since: </span>
                {new Date(profile.created_at).toLocaleDateString(undefined, {
                  dateStyle: "long",
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <ClaimNoteForm />

        <GeminiKeyCard />
      </main>
    </div>
  )
}
