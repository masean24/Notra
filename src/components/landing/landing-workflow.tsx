"use client"

import { PenLine, Sparkles, Share2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"

const steps = [
  {
    number: "01",
    icon: PenLine,
    title: "Instant Capture",
    description:
      "Open the editor and start writing immediately. Your thoughts are saved locally in real-time to your browser's IndexedDB vault. No account wall, zero friction.",
    badge: "0 Milliseconds",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Format & Polish with AI",
    description:
      "Hover over the left dock for formatting or type '/' for slash commands. Need a quick summary or title? Summon your BYOK AI copilot in a single keystroke.",
    badge: "Markdown + AI",
  },
  {
    number: "03",
    icon: Share2,
    title: "Organize or Share Privately",
    description:
      "Switch between notes in the Notion-style split dashboard, or share public/password-protected notes via 1-click secret links with zero data profiling.",
    badge: "Encrypted Links",
  },
]

export function LandingWorkflow() {
  return (
    <section id="how-it-works" aria-label="How Notra Works" className="py-20 sm:py-24 px-4 sm:px-8 border-y border-border/40 bg-muted/20">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3"
        >
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
            Streamlined 3-Step Flow
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-balance">
            How Notra Works
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground text-balance">
            From quick thought capture to collaborative sharing, designed to keep you in flow state.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                whileHover={{ y: -4 }}
                className="relative flex flex-col justify-between rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm transition-all duration-300 hover:border-brand hover:shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-primary/20 shrink-0">
                      {step.number}
                    </span>
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-medium text-primary whitespace-nowrap">
                      {step.badge}
                    </span>
                  </div>

                  <div className="flex size-11 sm:size-12 items-center justify-center rounded-2xl bg-muted border border-border/60 text-foreground">
                    <Icon className="size-5" />
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-5 border-t border-border/40 mt-6 flex items-center gap-2 text-xs font-semibold text-primary">
                  <span>Step {idx + 1} of 3</span>
                  <ArrowRight className="size-3" />
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 sm:mt-14 text-center"
        >
          <Button size="lg" render={<Link href="/new" />} className="h-11 px-7 text-sm font-semibold shadow-md hover:shadow-primary/20 transition-all">
            <span>Experience It Now — Free</span>
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
