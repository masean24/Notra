"use client"

import Link from "next/link"
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  Lock,
  SplitSquareVertical,
  SlidersHorizontal,
  History,
  Eye,
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
      className="py-24 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto w-full space-y-20"
    >
      {/* ==================== PART 1: DUAL WORKSPACE ARCHITECTURE ==================== */}
      <div className="space-y-12">
        {/* Editorial Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/60 pb-8"
        >
          <div className="space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-brand-ink">
              <span>01</span>
              <span className="text-border">/</span>
              <span>Two Ways To Work</span>
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-[-0.03em] leading-[1.1] text-foreground">
              Instant canvas for guests. <br className="hidden sm:inline" />
              <span className="text-brand-ink">Full Split Studio when you sign in.</span>
            </h2>
          </div>

          <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
            Whether you need a scratchpad in 0ms without logging in, or a synchronized multi-note knowledge vault across devices, Notra adapts to your workflow.
          </p>
        </motion.div>

        {/* 2-Column Architectural Showcase: Guest (/new) vs Member (/dashboard) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Track A: Guest Canvas (/new) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.04 }}
            className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-6 sm:p-8 transition-colors duration-300 hover:border-brand/50"
          >
            <div className="space-y-5">
              {/* Top Tag Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-[11px] font-mono text-foreground">
                  <FileText className="size-3.5 text-brand-ink" />
                  <span>/new · Guest Canvas</span>
                </div>
                <span className="rounded-full bg-brand/10 border border-brand/25 px-2.5 py-0.5 text-[10px] font-mono font-medium text-brand-ink">
                  No Login Required
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  Elevated Document Sheet &amp; Secret Edit Codes
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Open <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">/new</code> and start typing immediately. Notes save locally to IndexedDB in 0ms, with a floating bottom formatting dock and optional publishing via a <strong>3-word SHA-256 secret edit code</strong>.
                </p>
              </div>

              {/* Visual Preview of /new Elevated Sheet */}
              <div className="rounded-xl border border-border/80 bg-background/90 p-4 space-y-3.5">
                {/* Sheet Top Metadata */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded border border-border/70 bg-card px-2 py-0.5 text-[10px]">
                      💡 Change Icon
                    </span>
                    <span className="rounded border border-border/70 bg-card px-2 py-0.5 text-[10px]">
                      # Personal
                    </span>
                  </div>
                  <span className="font-mono text-[10px]">Today • ~1 min read</span>
                </div>

                {/* Sheet Body */}
                <div className="space-y-1.5 py-1">
                  <div className="text-sm font-semibold text-foreground">
                    Launch Checklist &amp; Notes
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">/</code> for commands, or pick a quick starter below.
                  </p>
                </div>

                {/* Floating Bottom Dock + Edit Code Preview */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-[10px] font-mono text-muted-foreground shadow-2xs">
                    <span className="font-bold text-foreground">B</span>
                    <span className="italic">I</span>
                    <span className="underline">U</span>
                    <span className="text-border">|</span>
                    <span className="text-brand-ink flex items-center gap-1">
                      <Wand2 className="size-2.5" /> Bottom Dock
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-brand/25 bg-brand/10 px-2.5 py-1 text-[10px] font-mono text-brand-ink">
                    <KeyRound className="size-3" />
                    <span>swift-coral-harbor</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono text-[11px]">
                Instant local draft · QR &amp; TTL links
              </span>
              <Link
                href="/new"
                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-brand-ink transition-colors"
              >
                <span>Open Guest Canvas</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </motion.div>

          {/* Track B: Member Split Studio (/dashboard) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-6 sm:p-8 transition-colors duration-300 hover:border-brand/50"
          >
            <div className="space-y-5">
              {/* Top Tag Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-[11px] font-mono text-foreground">
                  <SplitSquareVertical className="size-3.5 text-brand-ink" />
                  <span>/dashboard · Member Split Studio</span>
                </div>
                <span className="rounded-full bg-brand/15 border border-brand/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-brand-ink">
                  Free Account · Cloud Vault
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  Tri-Mode Split View &amp; Multi-Note Vault
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sign in to unlock the full <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">/dashboard</code> studio: switch seamlessly between <strong>Editor, Split View, and Live Preview</strong>, organize notes in a collapsible Vault sidebar, and claim custom vanity URLs.
                </p>
              </div>

              {/* Visual Preview of /dashboard Split Studio */}
              <div className="rounded-xl border border-border/80 bg-background/90 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2 text-[11px] text-muted-foreground">
                  <span className="font-mono font-medium text-foreground">roadmap-2026.md</span>
                  <div className="flex items-center rounded-md bg-muted/70 p-0.5 border border-border/50 text-[10px]">
                    <span className="px-2 py-0.5 text-muted-foreground">Editor</span>
                    <span className="px-2 py-0.5 rounded bg-card text-foreground shadow-2xs font-medium">
                      Split View
                    </span>
                    <span className="px-2 py-0.5 text-muted-foreground">Preview</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 text-xs">
                  {/* Mini Vault Sidebar */}
                  <div className="col-span-4 rounded-lg bg-muted/40 p-2 space-y-1 border border-border/40">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                      Cloud Vault
                    </div>
                    <div className="rounded bg-brand/15 border border-brand/25 px-1.5 py-1 text-[10px] font-medium text-foreground truncate">
                      Product Roadmap
                    </div>
                    <div className="px-1.5 py-0.5 text-[10px] text-muted-foreground truncate">
                      Architecture Spec
                    </div>
                  </div>

                  {/* Mini Editor */}
                  <div className="col-span-4 rounded-lg bg-card p-2 space-y-1 border border-border/50 font-mono text-[10px]">
                    <div className="text-muted-foreground text-[9px]">EDITOR</div>
                    <div className="text-foreground font-semibold">## Q4 Goals</div>
                    <div className="text-muted-foreground">- [x] Split Studio</div>
                  </div>

                  {/* Mini Live Preview */}
                  <div className="col-span-4 rounded-lg bg-muted/20 p-2 space-y-1 border border-border/50 text-[10px]">
                    <div className="flex items-center justify-between text-[9px] font-mono text-brand-ink">
                      <span>PREVIEW</span>
                      <Eye className="size-2.5" />
                    </div>
                    <div className="font-semibold text-foreground">Q4 Goals</div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="size-2.5 text-brand-ink shrink-0" />
                      <span className="line-through truncate">Split Studio</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono text-[11px]">
                Cloud sync · Custom SEO slugs · Encrypted AI key
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-brand-ink transition-colors"
              >
                <span>Open Split Studio</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ==================== PART 2: 3 REFINED CAPABILITY PILLARS ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pillar 1: BYOK Gemini Copilot */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-6 transition-colors duration-300 hover:border-brand/50 gap-6"
        >
          <div className="space-y-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand-ink border border-brand/20">
              <Sparkles className="size-4.5" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              BYOK Gemini 2.5 Copilot
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bring your own Google Gemini API key with zero monthly subscription fees. Summarize, rewrite tone, or brainstorm directly inside your note.
            </p>
          </div>

          <div className="rounded-xl border border-brand/20 bg-brand/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-brand-ink">
              <span>Gemini 2.5 Flash</span>
              <span>0% Markup</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-brand/15">
              <Lock className="size-3 text-brand-ink shrink-0" />
              <span>AES-256-GCM encrypted at rest</span>
            </div>
          </div>
        </motion.div>

        {/* Pillar 2: Writer's Ergonomics & Focus */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-6 transition-colors duration-300 hover:border-brand/50 gap-6"
        >
          <div className="space-y-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand-ink border border-brand/20">
              <SlidersHorizontal className="size-4.5" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Typography, Dock &amp; Word Goals
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Switch between <strong>Sans, Serif, and Mono</strong> typefaces, dock your toolbar at the bottom or left rail, and track daily word targets in real time.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <div className="rounded-md border border-brand/35 bg-brand/10 py-1 font-sans font-medium text-foreground">
                Ag Sans
              </div>
              <div className="rounded-md border border-border/60 bg-muted/40 py-1 font-serif text-muted-foreground">
                Ag Serif
              </div>
              <div className="rounded-md border border-border/60 bg-muted/40 py-1 font-mono text-muted-foreground">
                Ag Mono
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Target: 420 / 500 words</span>
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
          className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-6 transition-colors duration-300 hover:border-brand/50 gap-6"
        >
          <div className="space-y-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand-ink border border-brand/20">
              <History className="size-4.5" />
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
              <span className="text-muted-foreground">Snapshot #4</span>
              <span className="text-brand-ink">+18 / -3 lines</span>
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
