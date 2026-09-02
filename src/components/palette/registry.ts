import type { Command } from "./command-palette"

/**
 * Module-level registry for editor-scoped commands (SPEC §7). The single
 * CommandPalette instance in the root layout merges these with its global
 * commands when it opens, so Ctrl/Cmd+K works everywhere without two
 * competing key listeners. The editor registers on mount and clears on
 * unmount; nothing here touches React state.
 */
let editorCommands: Command[] | null = null

export function setEditorCommands(commands: Command[] | null): void {
  editorCommands = commands
}

export function getEditorCommands(): Command[] {
  return editorCommands ?? []
}
