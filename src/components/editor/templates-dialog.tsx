"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  NOTE_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type NoteTemplate,
} from "@/config/templates"

/**
 * Template library (SPEC §6): Blog Post, Meeting Notes, Essay, Resume,
 * Email, and more, organized by category. Applying a template replaces the
 * editor content through Tiptap's schema.
 */
export function TemplatesDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (template: NoteTemplate) => void
}) {
  const [category, setCategory] =
    useState<(typeof TEMPLATE_CATEGORIES)[number]>("Writing")

  const templates = NOTE_TEMPLATES.filter((t) => t.category === category)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Template library</DialogTitle>
          <DialogDescription>
            Applying a template replaces the current content.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {TEMPLATE_CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={c === category ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        <ul className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto">
          {templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => {
                  onApply(template)
                  onOpenChange(false)
                }}
                className="w-full rounded-lg border p-3 text-left transition-shadow hover:shadow-md"
              >
                <span className="block text-sm font-medium">{template.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {template.description}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">
          Tip: export your current content first if you want to keep it.
        </p>
      </DialogContent>
    </Dialog>
  )
}
