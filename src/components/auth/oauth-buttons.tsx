"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { authCallbackUrl } from "@/lib/auth/redirect"
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client"

type OAuthProvider = "google" | "github"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06a6.88 6.88 0 0 1-6.46-4.75H1.82v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.54 13.89a6.6 6.6 0 0 1 0-4.22V6.83H1.82a11 11 0 0 0 0 9.9l3.72-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 1.82 6.83l3.72 2.84A6.88 6.88 0 0 1 12 5.38z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58l-.01-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1-.1-.78-.42-1.31-.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.38.82 1.11.82 2.24l-.01 3.32c0 .32.21.7.82.58A12 12 0 0 0 12 .3z" />
    </svg>
  )
}

const PROVIDERS: Array<{
  id: OAuthProvider
  label: string
  icon: React.ReactNode
}> = [
  { id: "google", label: "Continue with Google", icon: <GoogleIcon /> },
  { id: "github", label: "Continue with GitHub", icon: <GitHubIcon /> },
]

/**
 * Google/GitHub OAuth via Supabase Auth (Section 3). The provider must be
 * enabled in the Supabase dashboard (Authentication → Providers); when it is
 * not, the redirect fails and the auth error state shows on return.
 */
export function OAuthButtons({ next }: { next?: string | null }) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null
  )

  async function signIn(provider: OAuthProvider) {
    setLoadingProvider(provider)
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: authCallbackUrl(next) },
      })
      if (error) {
        toast.error(
          "Could not start the sign-in. Check that the provider is enabled and try again."
        )
        setLoadingProvider(null)
      }
      // On success the browser is redirected to the provider; no reset needed.
    } catch {
      toast.error("Could not start the sign-in. Please try again.")
      setLoadingProvider(null)
    }
  }

  if (!isSupabaseConfigured()) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          className="w-full"
          disabled={loadingProvider !== null}
          onClick={() => signIn(provider.id)}
        >
          {provider.icon}
          {loadingProvider === provider.id ? "Redirecting…" : provider.label}
        </Button>
      ))}
    </div>
  )
}
