"use client"

import { useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

import { Button } from "@/components/ui/button"

type ViewTransitionDoc = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>
    finished: Promise<void>
  }
}

export function triggerThemeTransition(
  nextTheme: string,
  setTheme: (theme: string) => void,
  origin?: { x: number; y: number } | null
) {
  if (typeof window === "undefined") {
    setTheme(nextTheme)
    return
  }

  const doc = document as ViewTransitionDoc
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches

  if (!doc.startViewTransition || prefersReducedMotion) {
    document.documentElement.classList.add("theme-smooth-fallback")
    setTheme(nextTheme)
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-smooth-fallback")
    }, 450)
    return
  }

  const x = origin?.x ?? window.innerWidth - 48
  const y = origin?.y ?? 32
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )

  document.documentElement.classList.add("theme-view-transition")

  const transition = doc.startViewTransition(() => {
    flushSync(() => {
      setTheme(nextTheme)
    })
  })

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 560,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })
    .catch(() => {})

  transition.finished
    .finally(() => {
      document.documentElement.classList.remove("theme-view-transition")
    })
    .catch(() => {})
}

export function ThemeToggle({
  className,
  size = "icon",
}: {
  className?: string
  size?:
    | "default"
    | "xs"
    | "sm"
    | "lg"
    | "icon"
    | "icon-xs"
    | "icon-sm"
    | "icon-lg"
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const btnRef = useRef<HTMLButtonElement | null>(null)

  function handleToggle(e: React.MouseEvent<HTMLButtonElement>) {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
    const rect = btnRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : e.clientX
    const y = rect ? rect.top + rect.height / 2 : e.clientY

    triggerThemeTransition(nextTheme, setTheme, { x, y })
  }

  return (
    <Button
      ref={btnRef}
      variant="ghost"
      size={size}
      aria-label="Toggle theme"
      onClick={handleToggle}
      className={`relative overflow-hidden ${className ?? ""}`}
    >
      {/* Animated Sun & Moon morphing icons */}
      <Sun
        className="size-4 rotate-0 scale-100 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:-rotate-90 dark:scale-0"
        aria-hidden
      />
      <Moon
        className="absolute size-4 rotate-90 scale-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:rotate-0 dark:scale-100"
        aria-hidden
      />
    </Button>
  )
}
