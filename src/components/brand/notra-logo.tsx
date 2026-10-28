import { cn } from "@/lib/utils"

/**
 * Notra mark — two offset isometric planes forming an abstract folded page / "N".
 * Left plane uses `fill-foreground` (#171717 Obsidian in light mode, #F4F2ED in dark mode)
 * and right plane uses Muted Olive (#A5AD91).
 */
export function NotraMark({
  className,
  title,
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-5 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* Left Obsidian/CurrentColor Plane */}
      <path
        d="M2 6.5 Q2 5.0 3.15 5.68 L14.35 12.32 Q15.5 13.0 15.5 14.3 L15.5 29.3 Q15.5 30.8 14.35 30.12 L3.15 23.48 Q2 22.8 2 21.5 Z"
        fill="currentColor"
      />
      {/* Right Muted Olive Plane */}
      <path
        d="M16.5 2.7 Q16.5 1.2 17.65 1.88 L28.85 8.52 Q30 9.2 30 10.5 L30 25.5 Q30 27.0 28.85 26.32 L17.65 19.68 Q16.5 19.0 16.5 17.7 Z"
        fill="#A5AD91"
      />
    </svg>
  )
}

/** Primary horizontal logo: mark + "Notra" wordmark. */
export function NotraLogo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <NotraMark className={markClassName} />
      <span className={cn("font-bold tracking-tight", wordmarkClassName)}>
        Notra
      </span>
    </span>
  )
}
