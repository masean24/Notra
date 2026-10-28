"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Highlight from "@tiptap/extension-highlight"
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react"
import {
  ArrowRight,
  Bold,
  Columns,
  FileText,
  Highlighter,
  Italic,
  ListTodo,
  Sparkles,
  Bot,
  Copy,
  Check,
  Eye,
  Lock,
  Terminal,
  Target,
  FolderKanban,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SlashCommandMenu } from "@/components/editor/slash-command-menu"

interface VaultNote {
  id: "roadmap" | "architecture" | "security"
  filename: string
  badge: string
  html: string
  content: JSONContent
}

const VAULT_NOTES: VaultNote[] = [
  {
    id: "roadmap",
    filename: "roadmap-q4.md",
    badge: "Active",
    html: '<h2>Product Roadmap — Q4</h2><p>Click here to <strong>edit live</strong> or type <code>/</code> on a new line. Changes sync to the <mark>Live Preview</mark> instantly.</p><ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>0ms local IndexedDB draft vault</p></div></li><li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Tri-mode Editor, Split &amp; Reader view</p></div></li><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Share via SHA-256 secret edit code</p></div></li></ul>',
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Product Roadmap — Q4" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Click here to " },
            { type: "text", marks: [{ type: "bold" }], text: "edit live" },
            { type: "text", text: " or type " },
            { type: "text", marks: [{ type: "code" }], text: "/" },
            { type: "text", text: " on a new line. Changes sync to the " },
            { type: "text", marks: [{ type: "highlight" }], text: "Live Preview" },
            { type: "text", text: " instantly." },
          ],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "0ms local IndexedDB draft vault" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Tri-mode Editor, Split & Reader view" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Share via SHA-256 secret edit code" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "architecture",
    filename: "sync-engine.md",
    badge: "Synced",
    html: '<h2>Local-First Sync Engine</h2><p>Every keystroke commits directly to <strong>IndexedDB</strong> in under <code>10ms</code>, queuing background deltas for Supabase.</p><blockquote><p>Zero spinner walls. Full offline durability on flights and trains.</p></blockquote>',
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Local-First Sync Engine" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Every keystroke commits directly to " },
            { type: "text", marks: [{ type: "bold" }], text: "IndexedDB" },
            { type: "text", text: " in under " },
            { type: "text", marks: [{ type: "code" }], text: "10ms" },
            { type: "text", text: ", queuing background deltas for Supabase." },
          ],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Zero spinner walls. Full offline durability on flights and trains.",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "security",
    filename: "zero-trust.md",
    badge: "SHA-256",
    html: '<h2>Cryptographic Sharing</h2><p>Publish notes with a memorable 3-part secret code like <code>swift-coral-harbor</code> or set burn-after-reading TTL links.</p>',
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Cryptographic Sharing" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Publish notes with a memorable 3-part secret code like " },
            { type: "text", marks: [{ type: "code" }], text: "swift-coral-harbor" },
            { type: "text", text: " or set burn-after-reading TTL links." },
          ],
        },
      ],
    },
  },
]

const AI_PRESETS = [
  {
    id: "summarize",
    label: "Summarize",
    prompt: "/ai summarize into executive bullet points",
    output: [
      "Instant write workflow with zero registration barriers",
      "Real-time tri-mode workspace (Editor, Split View, Live Preview)",
      "Local-first durability in IndexedDB with offline conflict protection",
      "Encrypted sharing with SHA-256 edit codes & granular TTL expiration",
    ],
  },
  {
    id: "action-items",
    label: "Extract Tasks",
    prompt: "/ai extract actionable next steps",
    output: [
      "[x] Configure local IndexedDB draft auto-save (< 10ms latency)",
      "[ ] Claim custom vanity URL slug (/roadmap-2026) in SEO Studio",
      "[ ] Set 500-word daily writing goal in the status bar popover",
    ],
  },
  {
    id: "polish",
    label: "Polish Tone",
    prompt: "/ai rewrite in concise technical prose",
    output: [
      "Notra eliminates cloud roundtrip latency by persisting Tiptap AST transactions directly to IndexedDB, syncing asynchronously to Supabase PostgreSQL.",
    ],
  },
] as const

export function InteractiveHeroDemo() {
  const [activeTab, setActiveTab] = useState<"editor" | "split" | "ai">("split")
  const [studioMode, setStudioMode] = useState<"guest" | "member">("guest")
  const [selectedNoteId, setSelectedNoteId] =
    useState<VaultNote["id"]>("roadmap")
  const [aiPresetId, setAiPresetId] =
    useState<(typeof AI_PRESETS)[number]["id"]>("summarize")
  const [copied, setCopied] = useState(false)
  const [metrics, setMetrics] = useState<{
    words: number
    chars: number
    html: string
  }>({
    words: 34,
    chars: 214,
    html: VAULT_NOTES[0]!.html,
  })

  // 3D interactive mouse tilt + spotlight coordinates
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const spotlightX = useMotionValue(300)
  const spotlightY = useMotionValue(200)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3.5, -3.5]), {
    stiffness: 180,
    damping: 24,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4.5, 4.5]), {
    stiffness: 180,
    damping: 24,
  })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    mouseX.set(x / rect.width - 0.5)
    mouseY.set(y / rect.height - 0.5)
    spotlightX.set(x)
    spotlightY.set(y)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
    ],
    content: VAULT_NOTES[0]!.content,
    immediatelyRender: false,
    onCreate: ({ editor: ed }) => {
      const text = ed.state.doc.textContent || ""
      const trimmed = text.trim()
      setMetrics({
        words: trimmed ? trimmed.split(/\s+/).length : 0,
        chars: text.length,
        html: ed.getHTML(),
      })
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.state.doc.textContent || ""
      const trimmed = text.trim()
      setMetrics({
        words: trimmed ? trimmed.split(/\s+/).length : 0,
        chars: text.length,
        html: ed.getHTML(),
      })
    },
    editorProps: {
      attributes: {
        class: "tiptap tiptap-compact text-left focus:outline-none text-sm leading-relaxed",
        "aria-label": "Interactive notepad demo",
      },
    },
  })

  function handleSelectVaultNote(noteId: VaultNote["id"]) {
    const target = VAULT_NOTES.find((n) => n.id === noteId)
    if (!target) return
    setSelectedNoteId(noteId)
    if (editor) {
      editor.commands.setContent(target.content)
      const text = editor.state.doc.textContent || ""
      const trimmed = text.trim()
      setMetrics({
        words: trimmed ? trimmed.split(/\s+/).length : 0,
        chars: text.length,
        html: editor.getHTML(),
      })
    } else {
      setMetrics((prev) => ({ ...prev, html: target.html }))
    }
  }

  const activePreset = AI_PRESETS.find((p) => p.id === aiPresetId) ?? AI_PRESETS[0]
  const activeVaultNote =
    VAULT_NOTES.find((n) => n.id === selectedNoteId) ?? VAULT_NOTES[0]!
  const goalPercent = Math.min(100, Math.round((metrics.words / 45) * 100))

  const copyAiSample = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(activePreset.output.join("\n"))
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full perspective-[1400px] space-y-3"
    >
      {/* Top Experience Mode Switcher: Guest Canvas (/new) vs Member Split Studio (/dashboard) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/85 p-1.5 backdrop-blur-md shadow-sm">
        <div className="grid grid-cols-2 gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStudioMode("guest")}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              studioMode === "guest"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-3.5" />
            <span>Guest Canvas (/new)</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode("member")}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              studioMode === "member"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns className="size-3.5" />
            <span>Member Split Studio</span>
          </button>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" />
          {studioMode === "guest"
            ? "Instant access · No login needed"
            : "Signed-in workspace · Vault + Split View"}
        </span>
      </div>

      {/* 3D Tilt Studio Frame */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_28px_80px_-20px_rgba(0,0,0,0.45)]"
      >
        {studioMode === "guest" ? (
          /* ================= GUEST CANVAS (/new) PREVIEW ================= */
          <div className="flex flex-col">
            {/* Guest Top Bar matching /new */}
            <div className="flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="size-2.5 rounded-full bg-foreground/20" />
                  <div className="size-2.5 rounded-full bg-foreground/20" />
                  <div className="size-2.5 rounded-full bg-foreground/20" />
                </div>
                <span className="text-muted-foreground/40 font-mono">/</span>
                <span className="font-medium text-foreground truncate">
                  Product Roadmap — Q4
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-brand" />
                  Saved
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="hidden sm:flex items-center rounded-lg border border-border/70 bg-muted/40 px-2 py-1 text-[11px] gap-2">
                  <span className="text-brand-ink font-medium flex items-center gap-1">
                    <Sparkles className="size-3" /> AI
                  </span>
                  <span className="text-border">|</span>
                  <span className="text-muted-foreground">Templates</span>
                  <span className="text-border">|</span>
                  <span className="text-muted-foreground">Zen</span>
                </div>
                <Link
                  href="/new"
                  className="inline-flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background hover:opacity-90 transition-opacity"
                >
                  <span>Save &amp; Share</span>
                </Link>
              </div>
            </div>

            {/* Guest Elevated Document Sheet */}
            <div className="relative bg-muted/25 p-4 sm:p-6 pb-16 flex flex-col items-center">
              <div className="w-full max-w-xl rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-md text-left space-y-3">
                {/* Metadata row */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md border border-border/70 bg-muted/50 px-2 py-0.5">
                      💡 Note
                    </span>
                    <span className="rounded-md border border-border/70 bg-muted/50 px-2 py-0.5">
                      # Personal
                    </span>
                  </div>
                  <span className="font-mono text-[10px]">Today • ~1 min read</span>
                </div>

                {/* Interactive Editor inside Guest Sheet */}
                <div className="pt-1">
                  <SlashCommandMenu
                    editor={editor}
                    onOpenAi={() => {
                      setStudioMode("member")
                      setActiveTab("ai")
                    }}
                  />
                  <EditorContent editor={editor} />
                </div>
              </div>

              {/* Floating Bottom Formatting Dock matching /new */}
              <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-border/80 bg-card/95 px-2.5 py-1 shadow-xl backdrop-blur-md">
                {editor ? (
                  <>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        editor.isActive("bold")
                          ? "bg-accent text-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Bold"
                    >
                      <Bold className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        editor.isActive("italic")
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Italic"
                    >
                      <Italic className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHighlight().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        editor.isActive("highlight")
                          ? "bg-brand/20 text-brand-ink"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Highlight"
                    >
                      <Highlighter className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleTaskList().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        editor.isActive("taskList")
                          ? "bg-accent text-brand-ink"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Checklist"
                    >
                      <ListTodo className="size-3.5" />
                    </button>
                    <div className="mx-0.5 h-3.5 w-px bg-border" />
                    <button
                      type="button"
                      onClick={() => {
                        setStudioMode("member")
                        setActiveTab("ai")
                      }}
                      className="p-1.5 rounded-md bg-brand/15 text-brand-ink border border-brand/30 hover:bg-brand/25 transition-colors"
                      title="AI Assistant"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {/* Bottom Studio Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span>{metrics.words} words</span>
                <span>•</span>
                <span>{metrics.chars} chars</span>
                <span className="inline-flex items-center gap-1.5 text-brand-ink">
                  <span className="size-1.5 rounded-full bg-brand" />
                  <span>Guest Canvas (/new)</span>
                </span>
              </div>
              <Button
                size="xs"
                render={<Link href="/new" />}
                className="gap-1 h-7 text-xs font-medium"
              >
                <span>Open /new Canvas</span>
                <ArrowRight className="size-3" />
              </Button>
            </div>
          </div>
        ) : (
          /* ================= MEMBER SPLIT STUDIO (/dashboard) PREVIEW ================= */
          <div>
        {/* Window Title Bar & Interactive Tab Selector */}
        <div className="flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 gap-2">
          {/* Left: Window Dots & Active Filename */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="size-2.5 rounded-full bg-foreground/20" />
              <div className="size-2.5 rounded-full bg-foreground/20" />
              <div className="size-2.5 rounded-full bg-foreground/20" />
            </div>

            <span className="hidden md:inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <FolderKanban className="size-3.5 text-brand-ink" />
              <span className="text-foreground font-medium">
                {activeVaultNote.filename}
              </span>
            </span>

            <div className="flex items-center rounded-lg bg-muted/80 p-0.5 border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === "editor"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="size-3" />
                <span>Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("split")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === "split"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Columns className="size-3 text-brand-ink" />
                <span>Split View</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ai")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === "ai"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="size-3 text-brand-ink" />
                <span>AI Copilot</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-brand/15 text-brand-ink border border-brand/25 hidden sm:inline">
                  BYOK
                </span>
              </button>
            </div>
          </div>

          {/* Right: Quick Editor Toolbar */}
          {activeTab !== "ai" && editor ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-md hover:bg-background transition-colors ${
                  editor.isActive("bold")
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground"
                }`}
                title="Bold"
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-md hover:bg-background transition-colors ${
                  editor.isActive("italic")
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground"
                }`}
                title="Italic"
              >
                <Italic className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-1.5 rounded-md hover:bg-background transition-colors ${
                  editor.isActive("highlight")
                    ? "bg-brand/20 text-brand-ink shadow-2xs"
                    : "text-muted-foreground"
                }`}
                title="Highlight"
              >
                <Highlighter className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`p-1.5 rounded-md hover:bg-background transition-colors ${
                  editor.isActive("taskList")
                    ? "bg-background text-brand-ink shadow-2xs"
                    : "text-muted-foreground"
                }`}
                title="Checklist"
              >
                <ListTodo className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Workspace Body: Left Mini Vault Sidebar + Main Editor/Split/AI Surface */}
        <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[310px]">
          {/* Left Mini Vault Sidebar (Visible on xl screens for true Studio feel) */}
          <div className="hidden xl:flex xl:col-span-3 flex-col justify-between border-r border-border/60 bg-muted/20 p-3 text-left">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>Local Vault</span>
                <span className="text-brand-ink">3 notes</span>
              </div>
              <div className="space-y-1">
                {VAULT_NOTES.map((note) => {
                  const active = note.id === selectedNoteId
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => handleSelectVaultNote(note.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-all ${
                        active
                          ? "bg-brand/15 text-foreground font-semibold border border-brand/30 shadow-2xs"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                      }`}
                    >
                      <span className="truncate font-mono text-[11px]">
                        {note.filename}
                      </span>
                      <span className="text-[9px] font-mono text-brand-ink">
                        {note.badge}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Live Word Goal Bar inside Vault Sidebar */}
            <div className="rounded-xl border border-border/60 bg-background/70 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Target className="size-3 text-brand-ink" />
                  <span>Goal ({metrics.words}/45w)</span>
                </span>
                <span className="font-semibold text-brand-ink">{goalPercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Surface Content */}
          <div className="xl:col-span-9 flex flex-col min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === "editor" ? (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 sm:p-6 text-left flex-1"
                >
                  <SlashCommandMenu editor={editor} onOpenAi={() => setActiveTab("ai")} />
                  <EditorContent editor={editor} />
                </motion.div>
              ) : activeTab === "split" ? (
                <motion.div
                  key="split"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60 text-left flex-1"
                >
                  {/* Left Pane: Interactive Editor */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-1.5 text-[10px] font-mono text-muted-foreground">
                      <span className="font-bold uppercase tracking-wider">
                        Editor (Interactive)
                      </span>
                      <span>Type &ldquo;/&rdquo; for blocks</span>
                    </div>
                    <div className="p-4 sm:p-5 flex-1">
                      <SlashCommandMenu
                        editor={editor}
                        onOpenAi={() => setActiveTab("ai")}
                      />
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  {/* Right Pane: Synchronized Live Preview */}
                  <div className="flex flex-col justify-between min-w-0 bg-muted/15">
                    <div>
                      <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-1.5 text-[10px] font-mono">
                        <span className="font-bold uppercase tracking-wider text-muted-foreground">
                          Live Preview
                        </span>
                        <span className="inline-flex items-center gap-1 text-brand-ink font-medium">
                          <Eye className="size-3" />
                          <span>Synchronized</span>
                        </span>
                      </div>
                      <div className="p-4 sm:p-5">
                        <div
                          className="tiptap tiptap-compact pointer-events-none select-none text-sm leading-relaxed opacity-90"
                          dangerouslySetInnerHTML={{ __html: metrics.html }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 sm:p-6 space-y-4 text-left flex-1"
                >
                  {/* Preset switcher + Copy */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {AI_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAiPresetId(preset.id)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all border ${
                            aiPresetId === preset.id
                              ? "border-brand/50 bg-brand/15 text-brand-ink"
                              : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={copyAiSample}
                      className="flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 hover:text-foreground transition-colors text-[11px]"
                    >
                      {copied ? (
                        <Check className="size-3 text-brand-ink" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      <span>{copied ? "Copied" : "Copy Output"}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 font-mono text-[11px] text-brand-ink">
                    <Terminal className="size-3.5 shrink-0" />
                    <span>{activePreset.prompt}</span>
                  </div>

                  <div className="rounded-xl border border-brand/25 bg-brand/10 p-4 space-y-2 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-brand-ink" />
                        <span>Gemini 2.5 Flash Response</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                        <Lock className="size-2.5 text-brand-ink" />
                        <span>AES-256-GCM Encrypted Key</span>
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-muted-foreground list-disc pl-4 leading-relaxed">
                      {activePreset.output.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Studio Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span>Words: {metrics.words}</span>
            <span>Chars: {metrics.chars}</span>
            <span className="inline-flex items-center gap-1.5 text-brand-ink">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              <span>0ms local latency</span>
            </span>
          </div>
          <Button
            size="xs"
            render={<Link href="/dashboard" />}
            className="gap-1 h-7 text-xs font-medium"
          >
            <span>Open Split Studio</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>
        </div>
        )}
      </motion.div>
    </div>
  )
}
