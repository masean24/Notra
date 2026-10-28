"use client"

import Link from "next/link"
import {
  ArrowRight,
  Zap,
  Lock,
  HardDrive,
  Cpu,
  Columns2,
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

const architectureStats = [
  {
    index: "01",
    icon: Zap,
    metric: "< 10ms",
    label: "Keystroke Latency",
    description: "Every transaction commits directly to local IndexedDB with zero cloud spinner walls.",
  },
  {
    index: "02",
    icon: HardDrive,
    metric: "100%",
    label: "Local-First Vault",
    description: "Draft, search, and format offline on flights or trains with automatic delta sync.",
  },
  {
    index: "03",
    icon: Cpu,
    metric: "BYOK",
    label: "Gemini 2.5 Copilot",
    description: "Connect your own API key encrypted with AES-256-GCM. Zero monthly AI markup.",
  },
  {
    index: "04",
    icon: Lock,
    metric: "SHA-256",
    label: "Cryptographic Share",
    description: "Protect shared notes with 3-word secret edit phrases and self-destructing TTL links.",
  },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-svh flex flex-col bg-background text-foreground selection:bg-brand/25 selection:text-foreground overflow-x-clip">
      {/* Top Glassmorphic Editorial Navbar */}
      <LandingNavbar />

      <main className="relative flex-1 flex flex-col w-full overflow-x-clip">
        {/* Full-Viewport Hero Wrapper (Main Showcase + Architectural Telemetry Ledger) */}
        <div className="relative min-h-[calc(100svh-4rem)] flex flex-col justify-between overflow-hidden">
          {/* Subtle Warm Olive Radial Atmosphere + Interactive Constellation */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[720px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-8%,rgba(165,173,145,0.18),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_-8%,rgba(165,173,145,0.16),rgba(0,0,0,0))] -z-10"
            aria-hidden
          />
          <HeroConstellationCanvas />

          {/* Hero Main 2-Column Content */}
          <section className="relative z-10 flex-1 flex items-center px-4 sm:px-8 py-12 lg:py-16 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
              {/* Left Column: Editorial Brand Copy & Actions */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-7">
                {/* Release Eyebrow Pill */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <a
                    href="#features"
                    className="group inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-card/85 pl-2.5 pr-3.5 py-1 text-xs text-muted-foreground backdrop-blur-md hover:border-brand/60 hover:text-foreground transition-all shadow-2xs"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-ink">
                      <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                      Release 2.0
                    </span>
                    <span className="font-medium text-foreground/90">
                      Hybrid Paper Studio &amp; BYOK AI
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </a>
                </motion.div>

                {/* Monumental Editorial Headline */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.07 }}
                  className="space-y-4"
                >
                  <h1 className="text-4xl sm:text-5xl lg:text-[3.85rem] xl:text-[4.25rem] font-semibold tracking-[-0.035em] leading-[1.03] text-foreground">
                    Your thoughts,{" "}
                    <span className="block font-serif italic font-normal text-brand-ink">
                      smarter.
                    </span>
                  </h1>
                  <p className="text-base sm:text-lg font-medium tracking-tight text-foreground/85 max-w-md mx-auto lg:mx-0">
                    Quiet, local-first writing crafted for instant speed and architectural clarity.
                  </p>
                </motion.div>

                {/* Editorial Lead Description */}
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.14 }}
                  className="max-w-lg text-sm sm:text-[15px] text-muted-foreground leading-relaxed"
                >
                  Launch <strong className="font-medium text-foreground">/new</strong> to write on an elevated paper sheet in 0ms without an account—or sign in to enter the{" "}
                  <strong className="font-medium text-foreground">Split Studio</strong> with a synchronized editorial reader card and encrypted Gemini vault.
                </motion.p>

                {/* Dual Tactile Action Buttons + Spec Strip */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.21 }}
                  className="w-full space-y-4 pt-1"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center lg:justify-start justify-center gap-3 w-full sm:w-auto">
                    <Button
                      size="lg"
                      render={<Link href="/new" />}
                      className="h-12 rounded-xl px-6 text-sm font-semibold shadow-sm hover:opacity-92 transition-all active:scale-[0.98] gap-2.5"
                    >
                      <span>Start Writing Instantly</span>
                      <span className="rounded bg-background/20 px-1.5 py-0.5 font-mono text-[10px] font-normal opacity-90">
                        /new
                      </span>
                      <ArrowRight className="size-4" />
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      render={<Link href="/dashboard" />}
                      className="h-12 rounded-xl px-5 text-sm font-medium bg-card/75 border-border/80 hover:bg-muted/60 hover:border-brand/50 transition-all gap-2"
                    >
                      <Columns2 className="size-4 text-brand-ink" />
                      <span>Enter Split Studio</span>
                    </Button>
                  </div>

                  {/* Subtle Architectural Spec Strip */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1.5 text-[11px] font-mono text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-brand" />
                      Guest Canvas: No login wall
                    </span>
                    <span className="opacity-40">•</span>
                    <span>Member Studio: Free Cloud Vault</span>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: Interactive Dual-Mode Showcase */}
              <div className="lg:col-span-7 w-full min-w-0">
                <InteractiveHeroDemo />
              </div>
            </div>
          </section>

          {/* Architectural Telemetry Ledger Strip */}
          <section
            aria-label="Architecture Highlights"
            className="relative z-10 border-y border-border/70 bg-card/45 backdrop-blur-md w-full"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
              {architectureStats.map((stat, idx) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.25 + idx * 0.06 }}
                    className="group px-6 py-5 sm:py-6 flex flex-col justify-between gap-2.5 hover:bg-muted/25 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span className="text-brand-ink font-semibold">
                        // {stat.index}
                      </span>
                      <Icon className="size-3.5 text-muted-foreground group-hover:text-brand-ink transition-colors" />
                    </div>

                    <div className="flex items-baseline gap-2.5 pt-0.5">
                      <span className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                        {stat.metric}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {stat.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Section 01: Dual Workspace Architecture & Capability Pillars */}
        <LandingBento />

        {/* Section 02: Specification Comparison Matrix */}
        <LandingComparison />

        {/* Section 03: Transparent FAQ Accordion */}
        <LandingFaq />

        {/* Section 04: Signature Hybrid Obsidian CTA */}
        <LandingCta />
      </main>

      {/* Editorial Multi-Column Footer */}
      <LandingFooter />
    </div>
  )
}
