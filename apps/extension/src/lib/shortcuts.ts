import type { Hotkey } from "@tanstack/react-hotkeys"
import { normalizeHotkey, validateHotkey } from "@tanstack/react-hotkeys"

export interface ShortcutSettings {
  nextBoard: Hotkey | null
  previousBoard: Hotkey | null
  search: Hotkey | null
  toggleNextLayer: Hotkey | null
}

export type ShortcutId = keyof ShortcutSettings

interface ShortcutDefinition {
  description: string
  label: string
}

export const SHORTCUT_DEFINITIONS: Record<ShortcutId, ShortcutDefinition> = {
  nextBoard: {
    description: "Open the next board.",
    label: "Next board",
  },
  previousBoard: {
    description: "Open the previous board.",
    label: "Previous board",
  },
  search: {
    description: "Open or close card search.",
    label: "Search",
  },
  toggleNextLayer: {
    description: "Switch between board cards and the mixed timeline.",
    label: "Toggle Next Layer",
  },
}

export const SHORTCUT_ORDER: readonly ShortcutId[] = [
  "previousBoard",
  "nextBoard",
  "search",
  "toggleNextLayer",
]

export const DEFAULT_SHORTCUT_SETTINGS = {
  nextBoard: "ArrowRight",
  previousBoard: "ArrowLeft",
  search: "Mod+K",
  toggleNextLayer: "Space",
} satisfies ShortcutSettings

export function normalizeShortcutSettings(value: unknown): ShortcutSettings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SHORTCUT_SETTINGS }
  }

  return {
    nextBoard: normalizeHotkeyValue(
      value.nextBoard,
      DEFAULT_SHORTCUT_SETTINGS.nextBoard,
    ),
    previousBoard: normalizeHotkeyValue(
      value.previousBoard,
      DEFAULT_SHORTCUT_SETTINGS.previousBoard,
    ),
    search: normalizeHotkeyValue(
      value.search,
      DEFAULT_SHORTCUT_SETTINGS.search,
    ),
    toggleNextLayer: normalizeHotkeyValue(
      value.toggleNextLayer,
      DEFAULT_SHORTCUT_SETTINGS.toggleNextLayer,
    ),
  }
}

function normalizeHotkeyValue(value: unknown, fallback: Hotkey | null): Hotkey | null {
  if (value === null) {
    return null
  }
  if (typeof value !== "string" || !validateHotkey(value).valid) {
    return fallback
  }
  return normalizeHotkey(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
