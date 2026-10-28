"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Scale,
  HelpCircle,
  Columns2,
} from "lucide-react"
import { NotraMark } from "@/components/brand/notra-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { AuthNav } from "@/components/layout/auth-nav"
import { Button } from "@/components/ui/button"

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58l-.01-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1-.1-.78-.42-1.31-.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.38.82 1.11.82 2.24l-.01 3.32c0 .32.21.7.82.58A12 12 0 0 0 12 .3z" />
    </svg>
  )
}

const navLinks = [
  { href: "#features", label: "Architecture", icon: Sparkles },
  { href: "#pillars", label: "Craft & AI", icon: Columns2 },
  { href: "#comparison", label: "Spec Matrix", icon: Scale },
  { href: "#faq", label: "FAQ", icon: HelpCircle },
]

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false)
    }
    function onScroll() {
      setScrolled(window.scrollY > 12)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-border/70 bg-background/88 backdrop-blur-xl shadow-[0_1px_20px_-10px_rgba(0,0,0,0.08)]"
            : "border-b border-border/40 bg-background/70 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex lg:grid lg:grid-cols-[1fr_auto_1fr] h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          {/* Left: Brand Lockup */}
          <div className="flex items-center justify-start gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-foreground group shrink-0"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background shadow-2xs transition-transform duration-200 group-hover:scale-[1.03]">
                <NotraMark className="size-4.5" />
              </div>
              <span className="text-base font-semibold tracking-[-0.02em]">
                Notra
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-md border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              v2.0
            </span>
          </div>

          {/* Center: Mathematically Centered Editorial Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center justify-center gap-0.5 rounded-full border border-border/75 bg-card/80 p-1 shadow-2xs backdrop-blur-md"
          >
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right: Calm, Cohesive Actions */}
          <div className="flex items-center justify-end gap-1.5">
            <a
              href="https://github.com/Masean24/Notra"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              aria-label="GitHub Repository"
              title="Open Source on GitHub"
            >
              <GitHubIcon />
            </a>

            <ThemeToggle className="size-8 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors" />

            <div className="hidden sm:block h-4 w-px bg-border/70 mx-1.5" />

            <div className="hidden sm:flex items-center">
              <AuthNav />
            </div>

            <Button
              size="sm"
              render={<Link href="/new" />}
              className="h-8.5 rounded-lg gap-1.5 px-3.5 text-xs font-medium hidden sm:inline-flex shadow-2xs"
            >
              <span>Launch /new</span>
              <ArrowRight className="size-3" />
            </Button>

            {/* Mobile Hamburger Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden size-8 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu Sheet */}
      {mobileMenuOpen ? (
        <div className="fixed inset-0 top-16 z-30 lg:hidden bg-background/95 backdrop-blur-xl border-b overflow-y-auto animate-in fade-in-20 duration-200">
          <div className="flex flex-col p-6 space-y-6 max-w-lg mx-auto">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-3">
                Navigation
              </span>
              <nav className="flex flex-col space-y-1 pt-2">
                {navLinks.map((item) => {
                  const Icon = item.icon
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-3.5" />
                      </div>
                      <span>{item.label}</span>
                    </a>
                  )
                })}
              </nav>
            </div>

            <div className="h-px w-full bg-border/60" />

            <div className="space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-3">
                Workspace Access
              </span>
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  render={
                    <Link
                      href="/new"
                      onClick={() => setMobileMenuOpen(false)}
                    />
                  }
                  className="h-10 w-full justify-center text-sm font-semibold gap-2"
                >
                  <NotraMark className="size-4" />
                  <span>Open Guest Canvas (/new)</span>
                </Button>

                <div
                  className="flex items-center gap-2 pt-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <AuthNav isMobile />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40">
              <a
                href="https://github.com/Masean24/Notra"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <GitHubIcon />
                <span>GitHub Repository</span>
              </a>
              <span className="font-mono text-[11px]">MIT Licensed</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
