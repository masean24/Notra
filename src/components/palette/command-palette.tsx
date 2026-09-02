"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  FilePlus2,
  Keyboard,
  Moon,
  NotebookPen,
  Search,
  Settings,
} from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { getEditorCommands } from "@/components/palette/registry"
import { useTheme } from "next-themes"

export interface Command {
  id: string
  label: string
  /** Optional combo shown on the right, e.g. "Alt+N". */
  shortcut?: string
  icon?: React.ReactNode
  /** Navigate to this path on selection. */
  href?: string
  /** Run this action on selection (palette closes first). */
  action?: () => void
  /** Group ordering key — global commands come before editor commands. */
  group: string
}

const GROUP_ORDER = ["Navigate", "Editor", "Note", "Help"]

/** Shortcut cheat-sheet entries (SPEC §24). Mirrors the real handlers. */
export const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "Ctrl/Cmd + K", description: "Open the command palette" },
  { keys: "Alt + N", description: "New note (browser-reserved Ctrl+N is left alone)" },
  { keys: "Ctrl/Cmd + S", description: "Save (opens Save & Share for new notes)" },
  { keys: "Ctrl/Cmd + B / I", description: "Bold / italic in the editor" },
  { keys: "Esc", description: "Close dialogs / exit zen mode" },
]

function groupRank(group: string): number {
  const index = GROUP_ORDER.indexOf(group)
  return index === -1 ? GROUP_ORDER.length : index
}

/**
 * Global command palette (SPEC §7/§24): Ctrl/Cmd+K opens it anywhere;
 * Alt+N jumps to a new note without hijacking browser-reserved Ctrl+N/W/T.
 * A single root-layout instance serves every page; the editor extends it
 * via the module-level registry.
 */
export function CommandPalette() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [cheatsOpen, setCheatsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setCheatsOpen(false)
    setQuery("")
    setActive(0)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, setTheme])

  const globalCommands = useMemo<Command[]>(() => {
    const commands: Command[] = [
      {
        id: "new-note",
        label: "New note",
        shortcut: "Alt+N",
        group: "Navigate",
        href: "/new",
        icon: <FilePlus2 className="size-4" aria-hidden />,
      },
      {
        id: "go-dashboard",
        label: "Dashboard",
        group: "Navigate",
        href: "/dashboard",
        icon: <NotebookPen className="size-4" aria-hidden />,
      },
      {
        id: "go-settings",
        label: "Settings",
        group: "Navigate",
        href: "/settings",
        icon: <Settings className="size-4" aria-hidden />,
      },
      {
        id: "go-home",
        label: "Home",
        group: "Navigate",
        href: "/",
        icon: <NotebookPen className="size-4" aria-hidden />,
      },
      {
        id: "toggle-theme",
        label: "Toggle theme",
        group: "Editor",
        action: toggleTheme,
        icon: <Moon className="size-4" aria-hidden />,
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        group: "Help",
        action: () => setCheatsOpen(true),
        icon: <Keyboard className="size-4" aria-hidden />,
      },
    ]
    return commands
  }, [toggleTheme])

  // Global key handling. Ctrl/Cmd+K and Alt+N work on every page; reserved
  // browser combos (Ctrl+N/W/T) are never intercepted.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
        return
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "n") {
        event.preventDefault()
        router.push("/new")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [router])

  // Merge editor-scoped commands only while the palette is open.
  const [allCommands, setAllCommands] = useState<Command[]>(globalCommands)
  useEffect(() => {
    if (!open) {
      return
    }
    const pull = async () => {
      await Promise.resolve()
      setAllCommands([...globalCommands, ...getEditorCommands()])
    }
    void pull()
  }, [open, globalCommands])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matching = needle
      ? allCommands.filter((command) =>
          command.label.toLowerCase().includes(needle)
        )
      : allCommands
    return [...matching].sort(
      (a, b) => groupRank(a.group) - groupRank(b.group)
    )
  }, [allCommands, query])

  // Keep the highlight inside bounds when the filter changes.
  useEffect(() => {
    const clamp = async () => {
      await Promise.resolve()
      setActive((current) => Math.min(current, Math.max(filtered.length - 1, 0)))
    }
    void clamp()
  }, [filtered.length])

  useEffect(() => {
    if (open) {
      const focus = async () => {
        await Promise.resolve()
        inputRef.current?.focus()
      }
      void focus()
    }
  }, [open])

  const runCommand = useCallback(
    (command: Command) => {
      close()
      if (command.href) {
        router.push(command.href)
      } else if (command.action) {
        command.action()
      }
    },
    [close, router]
  )

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((current) => Math.min(current + 1, filtered.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((current) => Math.max(current - 1, 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const command = filtered[active]
      if (command) {
        runCommand(command)
      }
    }
  }

  let lastGroup = ""

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 border-b pb-2">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls="command-palette-list"
              aria-label="Search commands"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Type a command or search…"
              className="w-full bg-transparent text-sm outline-none"
            />
            <kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Esc
            </kbd>
          </div>

          <div
            ref={listRef}
            id="command-palette-list"
            role="listbox"
            aria-label="Commands"
            className="max-h-80 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No matching commands.
              </p>
            ) : (
              filtered.map((command, index) => {
                const showGroup = command.group !== lastGroup
                lastGroup = command.group
                return (
                  <div key={command.id}>
                    {showGroup ? (
                      <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {command.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => runCommand(command)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                        index === active ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      {command.icon}
                      <span className="flex-1">{command.label}</span>
                      {command.shortcut ? (
                        <kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {command.shortcut}
                        </kbd>
                      ) : null}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <p className="border-t pt-2 text-center text-[10px] text-muted-foreground">
            <Link href="/new" onClick={close}>
              New note
            </Link>{" "}
            · Ctrl/Cmd+K to toggle this palette · Alt+N for a new note
          </p>
        </div>
      </DialogContent>

      <ShortcutSheet open={cheatsOpen} onOpenChange={setCheatsOpen} />
    </Dialog>
  )
}

/** Keyboard shortcuts cheat-sheet (SPEC §24), reachable from the palette. */
export function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <Keyboard className="size-4" aria-hidden />
          Keyboard shortcuts
        </DialogTitle>
        <ul className="flex flex-col gap-2">
          {SHORTCUTS.map((entry) => (
            <li key={entry.keys} className="flex items-center justify-between gap-4 text-sm">
              <span>{entry.description}</span>
              <kbd className="whitespace-nowrap rounded border bg-muted px-1.5 py-0.5 text-xs">
                {entry.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Browser-reserved shortcuts (Ctrl+N, Ctrl+W, Ctrl+T) are never
          overridden.
        </p>
      </DialogContent>
    </Dialog>
  )
}
