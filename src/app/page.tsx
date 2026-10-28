"use client"

import Link from "next/link"
import {
  ArrowRight,
  Zap,
  Lock,
  HardDrive,
  Cpu,
} from "lucide-react"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { LandingNavbar } from "@/components/landing/landing-navbar"
import { InteractiveHeroDemo } from "@/components/landing/interactive-hero-demo"
import { HeroConstellationCanvas } from "@/components/landing/hero-constellation-canvas"
import { LandingBento } from "@/components/landing/landing-bento"
import { LandingComparison } from "@/components/landing/landing-comparison"
import { LandingFaq } from "@/components/landing/landing-faq"
import { LandingCta } from "@/components/landing/landing-cta"
import { LandingFooter } from "@/components/landing/landing-footer"

/* Vercel & Linear inspired stat strip */
const architectureStats = [
  {
    icon: Zap,
    metric: "< 10ms",
    label: "Input Latency",
    description: "Instant typing with zero cloud roundtrips while drafting.",
  },
  {
    icon: HardDrive,
    metric: "100%",
    label: "Local-First Vault",
    description: "Stored in IndexedDB. Fully functional offline on any device.",
  },
  {
    icon: Cpu,
    metric: "BYOK",
    label: "AI Copilot",
    description: "Plug Gemini 2.5 Flash directly. Encrypted with AES-256-GCM.",
  },
  {
    icon: Lock,
    metric: "SHA-256",
    label: "Hashed Access",
    description: "Secret edit codes and tokens are never stored in plain text.",
  },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-svh flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary overflow-x-clip">
      {/* Top Glassmorphic Navbar */}
      <LandingNavbar />

      <main className="relative flex-1 flex flex-col w-full overflow-x-clip">
        {/* Full-Viewport Hero Wrapper (Main Showcase + Integrated Telemetry Bar) */}
        <div className="relative min-h-[calc(100svh-3.75rem)] flex flex-col justify-between overflow-hidden">
          {/* Ambient glow mesh + interactive constellation canvas */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[680px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(165,173,145,0.16),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(165,173,145,0.20),rgba(0,0,0,0))] -z-10"
            aria-hidden
          />
          <HeroConstellationCanvas />

          {/* Hero Main 2-Column Content */}
          <section className="relative z-10 flex-1 flex items-center px-4 sm:px-8 py-12 lg:py-16 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
              {/* Left Column: Monumental Brand Copy & Actions */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
                {/* Release announcement pill */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <a
                    href="#features"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md hover:border-brand hover:text-foreground transition-colors shadow-2xs"
                  >
                    <span className="size-2 rounded-full bg-brand animate-pulse" />
                    <span className="font-semibold text-foreground">Notra 2.0</span>
                    <span className="text-border">·</span>
                    <span>Split Studio &amp; BYOK AI</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                  </a>
                </motion.div>

                {/* Main Headline — Larger, Monumental Proportion */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.08 }}
                  className="space-y-3"
                >
                  <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] xl:text-[4.15rem] font-bold tracking-[-0.04em] leading-[1.04] text-foreground">
                    Your thoughts,{" "}
                    <span className="block text-brand-ink">smarter.</span>
                  </h1>
                  <p className="text-lg sm:text-xl font-medium tracking-tight text-foreground/85">
                    The quiet, local-first workspace for notes &amp; AI.
                  </p>
                </motion.div>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.16 }}
                  className="max-w-lg text-sm sm:text-base text-muted-foreground leading-relaxed"
                >
                  Open <strong className="font-medium text-foreground">/new</strong> to draft immediately on a distraction-free sheet with zero signup—or sign in to unlock the <strong className="font-medium text-foreground">Split Studio</strong> with Cloud Vault and synchronized live preview.
                </motion.p>

                {/* Dual Action Buttons with Clear Mode Captions */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.24 }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-start lg:justify-start justify-center gap-3.5 pt-2 w-full sm:w-auto"
                >
                  <div className="flex flex-col items-center lg:items-start gap-1.5">
                    <Button
                      size="lg"
                      render={<Link href="/new" />}
                      className="w-full sm:w-auto h-12 rounded-xl px-7 text-sm font-semibold shadow-xs hover:opacity-90 transition-all active:scale-[0.98]"
                    >
                      <span>Start Writing Instantly</span>
                      <ArrowRight className="size-4 ml-1" />
                    </Button>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Guest Canvas (/new) · No login required
                    </span>
                  </div>

                  <div className="flex flex-col items-center lg:items-start gap-1.5">
                    <Button
                      size="lg"
                      variant="outline"
                      render={<Link href="/dashboard" />}
                      className="w-full sm:w-auto h-12 rounded-xl px-6 text-sm font-medium bg-card/60 border-border hover:bg-muted/60 transition-all"
                    >
                      <span>Open Split Studio</span>
                    </Button>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Member Workspace · Free account
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: 3D Interactive Studio Showcase */}
              <div className="lg:col-span-7 w-full min-w-0">
                <InteractiveHeroDemo />
              </div>
            </div>
          </section>

          {/* Integrated Bottom Architecture & Speed Telemetry Bar */}
          <section
            aria-label="Architecture Highlights"
            className="relative z-10 border-y border-border/50 bg-muted/20 backdrop-blur-sm py-6 px-4 sm:px-8 w-full"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {architectureStats.map((stat, idx) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.25 + idx * 0.07 }}
                    whileHover={{ y: -2 }}
                    className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-card/70 border border-border/50 hover:border-brand/40 transition-all"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-ink border border-brand/25">
                      <Icon className="size-4.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-base font-bold text-foreground whitespace-nowrap">
                          {stat.metric}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {stat.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {stat.description}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Streamlined 4-Card Bento Grid */}
        <LandingBento />

        {/* Deep Comparison Table */}
        <LandingComparison />

        {/* Interactive FAQ Accordion */}
        <LandingFaq />

        {/* High-Impact Bottom CTA Banner */}
        <LandingCta />
      </main>

      {/* Comprehensive Multi-Column Footer */}
      <LandingFooter />
    </div>
  )
}
