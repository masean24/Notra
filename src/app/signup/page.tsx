"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MailCheck } from "lucide-react"
import { NotraMark } from "@/components/brand/notra-logo"

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
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client"

export default function SignupPage() {
  const router = useRouter()
  const configured = isSupabaseConfigured()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    if (!configured) return
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
  }, [configured])

  async function handleSignOut() {
    await getSupabaseBrowserClient().auth.signOut()
    setSignedIn(false)
    router.refresh()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setSubmitting(true)
    try {
      const { data, error: authError } =
        await getSupabaseBrowserClient().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      if (authError) {
        setError(
          authError.message === "User already registered"
            ? "An account with this email already exists. Try signing in instead."
            : "Could not create the account. Please check your details and try again."
        )
        return
      }
      if (data.session) {
        // Email confirmation is disabled in this Supabase project.
        router.push("/dashboard")
        router.refresh()
      } else {
        setConfirmationSent(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold"
      >
        <NotraMark className="size-5" />
        Notra
      </Link>

      <Card className="w-full max-w-sm">
        {!configured ? (
          <>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
            </CardHeader>
            <CardContent>
              <p role="alert" className="text-sm text-muted-foreground">
                Supabase is not configured in this environment. Set{" "}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
                in <code className="font-mono">.env.local</code> — see the README
                for setup instructions.
              </p>
            </CardContent>
          </>
        ) : signedIn ? (
          <CardContent className="flex flex-col gap-3 py-6">
            <CardTitle className="text-lg">Already signed in</CardTitle>
            <p className="text-sm text-muted-foreground">
              You already have an active session.
            </p>
            <Button render={<Link href="/dashboard" />} className="w-full">
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              Sign out
            </Button>
          </CardContent>
        ) : confirmationSent ? (
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <MailCheck className="size-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Check your inbox</p>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to {email}. Open it to activate your
              account, then sign in.
            </p>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>
                Save notes, sync across devices, and organize your work. Writing
                never requires an account.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="flex flex-col gap-4">
                <OAuthButtons />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Separator className="flex-1" />
                  or sign up with email
                  <Separator className="flex-1" />
                </div>
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
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="mt-6 flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating account…" : "Create account"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="underline underline-offset-4">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </main>
  )
}
