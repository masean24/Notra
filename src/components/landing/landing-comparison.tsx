"use client"

import { Check, X, Minus } from "lucide-react"
import { motion } from "motion/react"

const rows = [
  {
    feature: "Instant Guest Canvas (/new) without login",
    notra: "Included (0ms)",
    notion: false,
    keep: false,
    obsidian: "Desktop app",
  },
  {
    feature: "Member Split Studio (/dashboard) & Cloud Vault",
    notra: "Free Account",
    notion: false,
    keep: false,
    obsidian: "Paid Sync",
  },
  {
    feature: "Local-first IndexedDB drafting (<10ms latency)",
    notra: "Default Engine",
    notion: false,
    keep: "Partial",
    obsidian: true,
  },
  {
    feature: "BYOK Gemini AI (Zero monthly AI subscription)",
    notra: "AES-256-GCM",
    notion: false,
    keep: false,
    obsidian: "Via Plugin",
  },
  {
    feature: "SHA-256 Secret Edit Codes, TTL & Vanity Slugs",
    notra: "Built-in",
    notion: false,
    keep: false,
    obsidian: false,
  },
  {
    feature: "100% Open Source (MIT) & Self-Hostable via Docker",
    notra: "MIT License",
    notion: false,
    keep: false,
    obsidian: false,
  },
]

export function LandingComparison() {
  return (
    <section
      id="comparison"
      aria-label="Specification Comparison"
      className="py-24 sm:py-32 px-4 sm:px-8 max-w-7xl mx-auto w-full border-t border-border/60"
    >
      {/* Editorial Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.55 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
      >
        <div className="space-y-3.5 max-w-2xl">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-brand-ink">
            <span>02</span>
            <span className="text-border">//</span>
            <span>Specification Matrix</span>
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-semibold tracking-[-0.03em] leading-[1.08] text-foreground">
            Quiet power,{" "}
            <span className="font-serif italic font-normal text-brand-ink">
              without the bloat.
            </span>
          </h2>
        </div>

        <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
          An architectural comparison against cloud workspaces and desktop markdown tools across latency, cryptographic privacy, and ownership.
        </p>
      </motion.div>

      {/* Specification Matrix Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.55 }}
        className="w-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs"
      >
        {/* Top Architectural Spec Bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 sm:px-6 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <span>SPEC REF // NOTRA-ARCH-2.0</span>
          <span className="text-brand-ink">VERIFIED BENCHMARKS</span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30">
                <th className="py-4 px-5 sm:px-6 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Capability
                </th>
                <th className="py-4 px-5 sm:px-6 font-semibold text-foreground bg-brand/[0.08] border-x border-brand/25">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-brand" />
                    <span>Notra v2.0</span>
                  </div>
                </th>
                <th className="py-4 px-5 sm:px-6 font-medium text-muted-foreground">
                  Notion
                </th>
                <th className="py-4 px-5 sm:px-6 font-medium text-muted-foreground">
                  Obsidian
                </th>
                <th className="py-4 px-5 sm:px-6 font-medium text-muted-foreground">
                  Google Keep
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr
                  key={row.feature}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="py-4 px-5 sm:px-6 font-medium text-foreground">
                    {row.feature}
                  </td>

                  {/* Notra Highlighted Column */}
                  <td className="py-4 px-5 sm:px-6 bg-brand/[0.05] border-x border-brand/20">
                    <div className="inline-flex items-center gap-2 text-foreground font-medium">
                      <span className="flex size-4.5 items-center justify-center rounded-full bg-brand/20 text-brand-ink">
                        <Check className="size-3 stroke-[2.5]" />
                      </span>
                      <span className="font-mono text-xs">{row.notra}</span>
                    </div>
                  </td>

                  {/* Notion */}
                  <td className="py-4 px-5 sm:px-6 text-muted-foreground">
                    {row.notion ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="size-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground/45">
                        <X className="size-3.5" /> No
                      </span>
                    )}
                  </td>

                  {/* Obsidian */}
                  <td className="py-4 px-5 sm:px-6 text-muted-foreground">
                    {row.obsidian === true ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="size-3.5" /> Yes
                      </span>
                    ) : typeof row.obsidian === "string" ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        <Minus className="size-3 text-brand-ink" />
                        {row.obsidian}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground/45">
                        <X className="size-3.5" /> No
                      </span>
                    )}
                  </td>

                  {/* Google Keep */}
                  <td className="py-4 px-5 sm:px-6 text-muted-foreground">
                    {row.keep === true ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="size-3.5" /> Yes
                      </span>
                    ) : typeof row.keep === "string" ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        <Minus className="size-3 text-brand-ink" />
                        {row.keep}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground/45">
                        <X className="size-3.5" /> No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  )
}
