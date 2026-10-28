"use client"

import {
  SlidersHorizontal,
  Type,
  Columns2,
  Moon,
  Sun,
  PanelBottom,
  PanelLeft,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type EditorFont = "sans" | "serif" | "mono"
export type EditorWidth = "standard" | "wide"
export type ToolbarPosition = "bottom" | "left"

interface ReadingSettingsPopoverProps {
  font: EditorFont
  onFontChange: (font: EditorFont) => void
  widthMode: EditorWidth
  onWidthModeChange: (width: EditorWidth) => void
  toolbarPosition?: ToolbarPosition
  onToolbarPositionChange?: (position: ToolbarPosition) => void
}

export function ReadingSettingsPopover({
  font,
  onFontChange,
  widthMode,
  onWidthModeChange,
  toolbarPosition = "bottom",
  onToolbarPositionChange,
}: ReadingSettingsPopoverProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isLight = resolvedTheme === "light"

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg bg-card/70 border-border/80 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-label="Typography and reading settings"
          />
        }
      >
        <SlidersHorizontal className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Appearance</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4 rounded-2xl p-4 text-xs shadow-2xl">
        {/* Theme Mode */}
        <div>
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Theme Mode
          </span>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs transition-all ${
                !isLight
                  ? "bg-card font-medium text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="size-3.5" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs transition-all ${
                isLight
                  ? "bg-card font-medium text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="size-3.5" />
              <span>Light</span>
            </button>
          </div>
        </div>

        {/* Toolbar Position */}
        {onToolbarPositionChange ? (
          <div>
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Toolbar Position
            </span>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => onToolbarPositionChange("bottom")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs transition-all ${
                  toolbarPosition === "bottom"
                    ? "bg-card font-medium text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PanelBottom className="size-3.5" />
                <span>Bottom Dock</span>
              </button>
              <button
                type="button"
                onClick={() => onToolbarPositionChange("left")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs transition-all ${
                  toolbarPosition === "left"
                    ? "bg-card font-medium text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PanelLeft className="size-3.5" />
                <span>Left Rail</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Typography */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Type className="size-3.5" />
            <span>Typography</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => onFontChange("sans")}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 transition-all ${
                font === "sans"
                  ? "bg-card font-semibold text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-sans text-sm">Ag</span>
              <span className="text-[10px]">Sans</span>
            </button>
            <button
              type="button"
              onClick={() => onFontChange("serif")}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 transition-all ${
                font === "serif"
                  ? "bg-card font-semibold text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-serif-editor text-sm">Ag</span>
              <span className="text-[10px]">Serif</span>
            </button>
            <button
              type="button"
              onClick={() => onFontChange("mono")}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 transition-all ${
                font === "mono"
                  ? "bg-card font-semibold text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-mono-editor text-sm">Ag</span>
              <span className="text-[10px]">Mono</span>
            </button>
          </div>
        </div>

        {/* Document Width */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Columns2 className="size-3.5" />
            <span>Document Width</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => onWidthModeChange("standard")}
              className={`rounded-lg py-1.5 text-center text-xs transition-all ${
                widthMode === "standard"
                  ? "bg-card font-medium text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => onWidthModeChange("wide")}
              className={`rounded-lg py-1.5 text-center text-xs transition-all ${
                widthMode === "wide"
                  ? "bg-card font-medium text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Wide
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
