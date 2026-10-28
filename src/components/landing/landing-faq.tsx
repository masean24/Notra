"use client"

import { ChevronDown, ArrowUpRight } from "lucide-react"
import { motion } from "motion/react"

const faqs = [
  {
    q: "What is the difference between Guest mode (/new) and signing in (/dashboard)?",
    a: "Anyone can open /new to write immediately on our Elevated Document Sheet with a floating formatting dock, 0ms local IndexedDB saving, and 3-part SHA-256 secret edit codes for sharing—no account required. Signing in unlocks /dashboard (Member Split Studio), which adds side-by-side Split View, a synced multi-note Cloud Vault, custom SEO vanity slugs, and cloud-encrypted BYOK Gemini keys.",
  },
  {
    q: "How does the BYOK (Bring Your Own Key) AI assistant work?",
    a: "Instead of charging a $20/month AI subscription, Notra lets you connect your own Google Gemini API key. Guests keep their key locally in browser IndexedDB, while signed-in members store it encrypted at rest with AES-256-GCM. You pay zero markup and can use Gemini 2.5 Flash's generous free tier.",
  },
  {
    q: "How do Secret Edit Codes protect guest notes?",
    a: "When you publish a note from /new without an account, Notra generates a memorable 3-word cryptographic phrase (such as 'swift-coral-harbor'). It is shown once and stored as a SHA-256 hash. Readers with the link can view the note, while only holders of the secret code can unlock editing.",
  },
  {
    q: "Does Notra work offline?",
    a: "Yes. Every keystroke commits directly to IndexedDB in under 10ms. You can draft, format, and switch notes offline on a flight or train, and our background sync engine reconciles queued changes with conflict resolution as soon as you reconnect.",
  },
  {
    q: "Can I self-host Notra on my own server?",
    a: "Absolutely. Notra is 100% open source under the MIT License. Clone the repository, configure your Supabase PostgreSQL credentials in .env.local, and run 'docker compose up -d --build'.",
  },
]

export function LandingFaq() {
  return (
    <section
      id="faq"
      aria-label="Frequently Asked Questions"
      className="py-24 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto w-full border-t border-border/50"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Asymmetric Editorial Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55 }}
          className="lg:col-span-5 space-y-4 lg:sticky lg:top-24"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-brand-ink">
            <span>03</span>
            <span className="text-border">/</span>
            <span>FAQ &amp; Architecture</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.12] text-foreground">
            Questions, answered <span className="text-brand-ink">transparently.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything you need to know about Guest Canvas vs. Member Split Studio, local-first storage, cryptographic sharing, and self-hosting.
          </p>
          <div className="pt-2">
            <a
              href="https://github.com/Masean24/Notra"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-foreground hover:text-brand-ink transition-colors"
            >
              <span>Inspect source &amp; Docker guide on GitHub</span>
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </motion.div>

        {/* Right Column: Hairline-Divided Accordion */}
        <div className="lg:col-span-7 divide-y divide-border/70 border-y border-border/70">
          {faqs.map((faq, idx) => (
            <motion.details
              key={faq.q}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
              className="group py-5 transition-colors"
            >
              <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden flex items-center justify-between gap-4">
                <span className="text-sm sm:text-base group-hover:text-brand-ink transition-colors">
                  {faq.q}
                </span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="pt-3 pr-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {faq.a}
              </p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  )
}
