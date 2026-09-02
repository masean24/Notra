"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { NotebookPen } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { sanitizeNextPath } from "@/lib/auth/redirect"
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client"

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold"
      >
        <NotebookPen className="size-5" aria-hidden />
        OpenNotepad
      </Link>

      <Suspense
        fallback={
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
            </CardHeader>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const configured = isSupabaseConfigured()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  const callbackFailed =
    searchParams.get("error") === "auth_callback_failed"
  const nextPath = sanitizeNextPath(searchParams.get("next"))

  useEffect(() => {
    if (!configured) return
    // Detect an existing session so we can offer a clean sign-out instead of
    // presenting a confusing login form.
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
  }, [configured])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword(
        { email, password }
      )
      if (error) {
        router.replace("/login?error=invalid_credentials")
        return
      }
      router.push(nextPath)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    await getSupabaseBrowserClient().auth.signOut()
    setSignedIn(false)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Sign in to manage your notes across devices.
        </CardDescription>
      </CardHeader>

      {!configured ? (
        <CardContent>
          <p role="alert" className="text-sm text-muted-foreground">
            Supabase is not configured in this environment. Set{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
            <code className="font-mono">.env.local</code> — see the README for
            setup instructions.
          </p>
        </CardContent>
      ) : signedIn ? (
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            You are already signed in.
          </p>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <OAuthButtons next={searchParams.get("next")} />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              or continue with email
              <Separator className="flex-1" />
            </div>
            {callbackFailed ? (
              <p role="alert" className="text-sm text-destructive">
                The sign-in link was invalid or has expired. Please try signing
                in again.
              </p>
            ) : null}
            {searchParams.get("error") === "invalid_credentials" ? (
              <p role="alert" className="text-sm text-destructive">
                Invalid email or password. Please try again.
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-sm text-muted-foreground">
              No account yet?{" "}
              <Link href="/signup" className="underline underline-offset-4">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
