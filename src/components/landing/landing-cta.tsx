"use client"

import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"

export function LandingCta() {
  return (
    <section aria-label="Get Started" className="py-20 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.55 }}
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-8 sm:p-12 md:p-16 text-center"
      >
        {/* Subtle Olive Ambient Glow */}
        <div
          className="absolute -top-36 left-1/2 -translate-x-1/2 size-96 rounded-full bg-brand/12 blur-3xl pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-brand-ink">
            <span>04</span>
            <span className="text-border">/</span>
            <span>Ready When You Are</span>
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.08] text-foreground text-balance">
            Your thoughts, <span className="text-brand-ink">smarter.</span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground text-balance leading-relaxed">
            Jump straight into the Guest Canvas with zero signup—or sign in to organize your notes inside the Member Split Studio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 w-full max-w-xs sm:max-w-none mx-auto">
            <Button
              size="lg"
              render={<Link href="/new" />}
              className="w-full sm:w-auto h-12 rounded-xl px-7 text-sm font-semibold shadow-xs hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <span>Launch Guest Canvas (/new)</span>
              <ArrowRight className="size-4 ml-1.5" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              render={<Link href="/dashboard" />}
              className="w-full sm:w-auto h-12 rounded-xl px-6 text-sm font-medium border-border/80 bg-background/60 hover:bg-muted transition-all"
            >
              <span>Enter Split Studio (/dashboard)</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 text-xs font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="size-3.5 text-brand-ink shrink-0" />
              <span>No account wall for /new</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="size-3.5 text-brand-ink shrink-0" />
              <span>BYOK Gemini 2.5 Flash</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="size-3.5 text-brand-ink shrink-0" />
              <span>100% Open Source (MIT)</span>
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
