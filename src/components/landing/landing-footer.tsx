import Link from "next/link"
import { GitBranch, ShieldCheck } from "lucide-react"
import { NotraMark } from "@/components/brand/notra-logo"

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden fill="currentColor">
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58l-.01-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1-.1-.78-.42-1.31-.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.38.82 1.11.82 2.24l-.01 3.32c0 .32.21.7.82.58A12 12 0 0 0 12 .3z" />
    </svg>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40 bg-card/40 text-muted-foreground text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10">
          {/* Col 1: Brand & Status (2-col on desktop) */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground">
              <NotraMark className="size-7" />
              <span className="text-base font-bold">Notra</span>
              <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-mono text-primary">
                v2.0
              </span>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Your thoughts, smarter. An AI-powered notes and knowledge workspace engineered for speed, privacy, and focus. No accounts required, no telemetry, always free.
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs text-brand-ink">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              <span className="font-medium">All systems operational</span>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Product
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/new" className="hover:text-foreground transition-colors">
                  Guest Canvas (/new)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Member Split Studio
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Hover Toolbar &amp; Slash
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  BYOK AI Copilot
                </a>
              </li>
              <li>
                <a href="#comparison" className="hover:text-foreground transition-colors">
                  Feature Comparison
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Architecture & Privacy */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Privacy &amp; Tech
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-muted-foreground/80">Local-First Vault</span>
              </li>
              <li>
                <span className="text-muted-foreground/80">Zero Third-Party Trackers</span>
              </li>
              <li>
                <span className="text-muted-foreground/80">SHA-256 Hashed Secrets</span>
              </li>
              <li>
                <span className="text-muted-foreground/80">Tiptap ProseMirror Engine</span>
              </li>
              <li>
                <span className="text-muted-foreground/80">Supabase &amp; IndexedDB</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Open Source */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Open Source
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://github.com/Masean24/Notra"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <GitHubIcon />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Masean24/Notra#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Docker Self-Host
                </a>
              </li>
              <li>
                <span className="text-muted-foreground/80">MIT License</span>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  Community FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} Notra. Open source software released under MIT License.</p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <GitBranch className="size-3.5" />
              <span>Zero Vendor Lock-in</span>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5" />
              <span>Self-Hostable</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
