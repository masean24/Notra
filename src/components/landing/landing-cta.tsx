"use client"

import Link from "next/link"
import { ArrowRight, Columns2, ShieldCheck } from "lucide-react"
import { motion } from "motion/react"
import { NotraMark } from "@/components/brand/notra-logo"

export function LandingCta() {
  return (
    <section
      aria-label="Get Started"
      className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto w-full"
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.55 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#171717] text-[#FAF9F6] p-8 sm:p-14 md:p-16 text-center shadow-[0_32px_90px_-24px_rgba(0,0,0,0.45)]"
      >
        {/* Subtle Muted Olive Ambient Glow inside the Obsidian Card */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 size-[420px] rounded-full bg-[#A5AD91]/15 blur-3xl pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#A5AD91]">
            <NotraMark className="size-3.5 text-[#FAF9F6]" />
            <span>04 // Ready When You Are</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.06] text-[#FAF9F6] text-balance">
            Your thoughts,{" "}
            <span className="font-serif italic font-normal text-[#A5AD91]">
              smarter.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-white/70 text-balance leading-relaxed max-w-xl mx-auto">
            Draft immediately on the Guest Canvas with zero signup—or sign in to organize your local-first knowledge vault inside the Member Split Studio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 w-full max-w-xs sm:max-w-none mx-auto">
            <Link
              href="/new"
              className="inline-flex w-full sm:w-auto h-12 items-center justify-center gap-2 rounded-xl bg-[#FAF9F6] px-7 text-sm font-semibold text-[#171717] shadow-xs hover:bg-[#EFECE6] transition-all active:scale-[0.98]"
            >
              <span>Launch Guest Canvas (/new)</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex w-full sm:w-auto h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-6 text-sm font-medium text-[#FAF9F6] hover:bg-white/[0.1] transition-all"
            >
              <Columns2 className="size-4 text-[#A5AD91]" />
              <span>Enter Split Studio (/dashboard)</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs font-mono text-white/60">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="size-3.5 text-[#A5AD91] shrink-0" />
              <span>No account wall for /new</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="size-3.5 text-[#A5AD91] shrink-0" />
              <span>BYOK Gemini 2.5 Flash</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="size-3.5 text-[#A5AD91] shrink-0" />
              <span>100% Open Source (MIT)</span>
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
