"use client"

import { useState } from "react"
import { Target, Check, Clock, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface WordTargetPopoverProps {
  words: number
  characters: number
  readingMinutes: number
  wordTarget: number
  onWordTargetChange: (target: number) => void
}

export function WordTargetPopover({
  words,
  characters,
  readingMinutes,
  wordTarget,
  onWordTargetChange,
}: WordTargetPopoverProps) {
  const [inputValue, setInputValue] = useState(wordTarget > 0 ? String(wordTarget) : "")
  const [open, setOpen] = useState(false)

  const progress = wordTarget > 0 ? Math.min(100, Math.round((words / wordTarget) * 100)) : 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Math.max(0, Math.min(500000, Number(inputValue) || 0))
    onWordTargetChange(parsed)
    setOpen(false)
  }

  function handleQuickGoal(goal: number) {
    setInputValue(String(goal))
    onWordTargetChange(goal)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-border/80 bg-card/85 backdrop-blur-md px-3.5 py-1.5 text-xs font-mono text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground shadow-lg"
            aria-label="Word count and goal statistics"
          />
        }
      >
        <span>
          <strong className="font-semibold text-foreground">{words}</strong> words
        </span>
        <span className="text-border">•</span>
        <span>
          <strong className="font-semibold text-foreground">{characters}</strong> chars
        </span>

        {wordTarget > 0 ? (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-border/70">
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-300 ${
                  progress >= 100 ? "bg-brand" : "bg-primary"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-[10px]">{progress}%</span>
          </div>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="end" side="top" className="w-72 space-y-4 rounded-2xl p-4 text-xs shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-medium text-foreground">Document Statistics</span>
            <Target className="size-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              <span>{words} words</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono">Aa</span>
              <span>{characters} characters</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <Clock className="size-3.5" />
              <span>~{Math.max(1, readingMinutes)} min reading time</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <Label htmlFor="target-input" className="text-xs font-medium text-foreground">
            Daily / Document Goal
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="target-input"
              type="number"
              min={0}
              max={500000}
              placeholder="e.g. 500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8 text-xs font-mono"
            />
            <Button type="submit" size="sm" className="h-8 px-3 text-xs">
              <Check className="size-3.5 mr-1" />
              Set
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleQuickGoal(250)}
              className="rounded-md border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              250 w
            </button>
            <button
              type="button"
              onClick={() => handleQuickGoal(500)}
              className="rounded-md border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              500 w
            </button>
            <button
              type="button"
              onClick={() => handleQuickGoal(1000)}
              className="rounded-md border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              1k w
            </button>
            {wordTarget > 0 ? (
              <button
                type="button"
                onClick={() => handleQuickGoal(0)}
                className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/20"
              >
                Clear goal
              </button>
            ) : null}
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
