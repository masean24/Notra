"use client"

import Link from "next/link"
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  Lock,
  Columns2,
  SlidersHorizontal,
  History,
  FileText,
  ArrowUpRight,
  Wand2,
} from "lucide-react"
import { motion } from "motion/react"

export function LandingBento() {
  return (
    <section
      id="features"
      aria-label="Workspace Architecture and Core Capabilities"
      className="py-24 sm:py-32 px-4 sm:px-8 max-w-7xl mx-auto w-full space-y-24"
    >
      {/* ==================== PART 1: DUAL WORKSPACE ARCHITECTURE ==================== */}
      <div className="space-y-14">
        {/* Editorial Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/70 pb-8"
        >
          <div className="space-y-3.5 max-w-2xl">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-brand-ink">
              <span>01</span>
              <span className="text-border">//</span>
              <span>Dual Workspace Architecture</span>
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-semibold tracking-[-0.03em] leading-[1.08] text-foreground">
              Instant paper for guests. <br className="hidden sm:inline" />
              <span className="font-serif italic font-normal text-brand-ink">
                Full Split Studio when you sign in.
              </span>
            </h2>
          </div>

          <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
            Whether you need a zero-latency scratchpad in 0ms without logging in, or a synchronized multi-note knowledge studio across devices, Notra adapts to your exact state of flow.
          </p>
        </motion.div>

        {/* 2-Column Architectural Showcase: Guest (/new) vs Member (/dashboard) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Track A: Guest Canvas (/new) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.04 }}
            className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 sm:p-8 transition-all duration-300 hover:border-brand/60 hover:shadow-[0_20px_60px_-24px_rgba(0,0,0,0.12)]"
          >
            <div className="space-y-6">
              {/* Top Architectural Tag Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4">
                <div className="inline-flex items-center gap-2 font-mono text-[11px] text-foreground">
                  <span className="text-brand-ink font-semibold">TRACK 01</span>
                  <span className="text-border">/</span>
                  <FileText className="size-3.5 text-brand-ink" />
                  <span className="font-medium">/new · Guest Canvas</span>
                </div>
                <span className="rounded-full bg-brand/12 border border-brand/30 px-2.5 py-0.5 text-[10px] font-mono font-medium text-brand-ink">
                  No Login Wall
                </span>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  Elevated Document Sheet &amp; Secret Edit Codes
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Open <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">/new</code> and write immediately on a tactile paper sheet. Every keystroke commits to IndexedDB in 0ms, with a floating bottom formatting dock and optional publishing via a{" "}
                  <strong className="font-medium text-foreground">3-word SHA-256 secret edit code</strong>.
                </p>
              </div>

              {/* Miniature Visual Exhibit of /new Elevated Sheet */}
              <div className="rounded-xl border border-border/80 bg-muted/25 p-4 sm:p-5">
                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3.5">
                  {/* Sheet Top Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px]">
                        💡 Idea
                      </span>
                      <span className="rounded border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px]">
                        # Architecture
                      </span>
                    </div>
                    <span className="font-mono text-[10px]">
                      IndexedDB • 0ms
                    </span>
                  </div>

                  {/* Sheet Body */}
                  <div className="space-y-1.5 py-1">
                    <div className="font-serif text-base font-semibold text-foreground">
                      Q4 Product Architecture Notes
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Type <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">/</code> for instant blocks, or highlight text to summon the formatting bar.
                    </p>
                  </div>

                  {/* Floating Bottom Dock + Edit Code Preview */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/50">
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-[10px] font-mono text-muted-foreground shadow-2xs">
                      <span className="font-bold text-foreground">B</span>
                      <span className="italic">I</span>
                      <span className="underline">U</span>
                      <span className="text-border">|</span>
                      <span className="text-brand-ink flex items-center gap-1">
                        <Wand2 className="size-2.5" /> Bottom Dock
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/12 px-2.5 py-1 text-[10px] font-mono text-brand-ink">
                      <KeyRound className="size-3" />
                      <span>swift-coral-harbor</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono text-[11px]">
                Instant local draft · QR &amp; TTL burn links
              </span>
              <Link
                href="/new"
                className="inline-flex items-center gap-1 font-semibold text-foreground group-hover:text-brand-ink transition-colors"
              >
                <span>Open Guest Canvas</span>
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </motion.div>

          {/* Track B: Member Split Studio (/dashboard) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 sm:p-8 transition-all duration-300 hover:border-brand/60 hover:shadow-[0_20px_60px_-24px_rgba(0,0,0,0.12)]"
          >
            <div className="space-y-6">
              {/* Top Architectural Tag Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4">
                <div className="inline-flex items-center gap-2 font-mono text-[11px] text-foreground">
                  <span className="text-brand-ink font-semibold">TRACK 02</span>
                  <span className="text-border">/</span>
                  <Columns2 className="size-3.5 text-brand-ink" />
                  <span className="font-medium">/dashboard · Split Studio</span>
                </div>
                <span className="rounded-full bg-brand/15 border border-brand/35 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-brand-ink">
                  Free Account · Cloud Vault
                </span>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  Hybrid Paper Shell &amp; Editorial Reader Card
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sign in to unlock the full <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">/dashboard</code> studio: switch between{" "}
                  <strong className="font-medium text-foreground">Home Hub, All Vault Notes, and Tri-Mode Split Studio</strong> with a synchronized Editorial Reader Card and 3 Canvas Vibes.
                </p>
              </div>

              {/* Miniature Visual Exhibit of /dashboard Hybrid Paper Split Studio */}
              <div className="rounded-xl bg-[#171717] p-2.5 border border-border/80 shadow-inner">
                <div className="grid grid-cols-12 gap-2 text-xs">
                  {/* Mini Obsidian App Shell Sidebar */}
                  <div className="col-span-4 rounded-lg bg-[#171717] text-[#FAF9F6] p-2.5 space-y-1.5 border border-white/10">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-white/45">
                      <span>Local Vault</span>
                      <span className="text-[#A5AD91]">v2.0</span>
                    </div>
                    <div className="rounded bg-white/12 px-2 py-1 text-[10px] font-medium text-white truncate">
                      ★ roadmap-q4.md
                    </div>
                    <div className="px-2 py-0.5 text-[10px] text-white/55 truncate">
                      sync-engine.md
                    </div>
                    <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-[#A5AD91]">
                      <span>Flow</span>
                      <span>84%</span>
                    </div>
                  </div>

                  {/* Mini Floating Inset Paper Canvas */}
                  <div className="col-span-8 rounded-lg bg-[#FAF9F6] text-[#171717] p-2.5 border border-[#E7E5E0] space-y-2">
                    <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-1.5 text-[9px] font-mono">
                      <span className="font-semibold">Split Studio</span>
                      <span className="rounded bg-[#171717] text-[#FAF9F6] px-1.5 py-0.2">
                        Hybrid Paper
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="space-y-1 font-mono pr-1 border-r border-[#E7E5E0]">
                        <div className="text-[8px] text-[#777777]">EDITOR</div>
                        <div className="font-semibold">## Q4 Goals</div>
                        <div className="text-[#777777]">- [x] Reader Card</div>
                      </div>
                      <div className="rounded-md border border-[#E7E5E0] bg-white p-1.5 space-y-1 font-serif">
                        <div className="text-[8px] font-mono text-[#5C6349] font-semibold">
                          LIVE READER
                        </div>
                        <div className="font-semibold">Q4 Goals</div>
                        <div className="flex items-center gap-1 text-[#777777] font-sans text-[9px]">
                          <CheckCircle2 className="size-2.5 text-[#5C6349] shrink-0" />
                          <span>Reader Card</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono text-[11px]">
                3 Canvas Vibes · Custom SEO slugs · Cloud Vault
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 font-semibold text-foreground group-hover:text-brand-ink transition-colors"
              >
                <span>Enter Split Studio</span>
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ==================== PART 2: 3 REFINED CAPABILITY PILLARS ==================== */}
      <div id="pillars" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pillar 1: BYOK Gemini Copilot */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 sm:p-7 transition-all duration-300 hover:border-brand/60 gap-6"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand/12 text-brand-ink border border-brand/25">
                <Sparkles className="size-4.5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                PILLAR // 01
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              BYOK Gemini 2.5 Copilot
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect your own Google Gemini API key with zero monthly AI markup. Summarize long notes, refine tone, or extract action items in one click.
            </p>
          </div>

          <div className="rounded-xl border border-brand/25 bg-brand/[0.06] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-brand-ink font-medium">
              <span>gemini-2.5-flash</span>
              <span>$0 / mo markup</span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 pt-1.5 border-t border-brand/15">
              <Lock className="size-3 text-brand-ink shrink-0" />
              <span>AES-256-GCM encrypted vault</span>
            </div>
          </div>
        </motion.div>

        {/* Pillar 2: Writer's Ergonomics & Focus */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 sm:p-7 transition-all duration-300 hover:border-brand/60 gap-6"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand/12 text-brand-ink border border-brand/25">
                <SlidersHorizontal className="size-4.5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                PILLAR // 02
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Editorial Typography &amp; Flow
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pair geometric Sans, warm Editorial Serif, or technical Mono typefaces with customizable toolbar docking and daily word targets.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <div className="rounded-md border border-border/60 bg-muted/40 py-1 font-sans text-muted-foreground">
                Ag Sans
              </div>
              <div className="rounded-md border border-brand/40 bg-brand/12 py-1 font-serif font-medium text-foreground">
                Ag Serif
              </div>
              <div className="rounded-md border border-border/60 bg-muted/40 py-1 font-mono text-muted-foreground">
                Ag Mono
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Session Flow: 840 / 1,000w</span>
              <span className="text-brand-ink font-semibold">84%</span>
            </div>
          </div>
        </motion.div>

        {/* Pillar 3: Revisions & Multi-Format Export */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 sm:p-7 transition-all duration-300 hover:border-brand/60 gap-6"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand/12 text-brand-ink border border-brand/25">
                <History className="size-4.5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                PILLAR // 03
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Revision Diffs &amp; Zero Lock-in
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Inspect line-by-line version history and restore snapshots in one click. Export anytime to Markdown, HTML, Plain Text, JSON AST, or PDF.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/80 px-3 py-1.5 text-[11px] font-mono">
              <span className="text-muted-foreground">Snapshot #12</span>
              <span className="text-brand-ink font-medium">+24 / -3 lines</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[".md", ".html", ".txt", ".json", ".pdf"].map((ext) => (
                <span
                  key={ext}
                  className="rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
