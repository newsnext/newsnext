import type { Hotkey } from "@tanstack/react-hotkeys"
import { normalizeHotkey, validateHotkey } from "@tanstack/react-hotkeys"

export interface ShortcutSettings {
  search: Hotkey | null
  toggleNextLayer: Hotkey | null
}

export type ShortcutId = keyof ShortcutSettings

interface ShortcutDefinition {
  description: string
  label: string
}

export const SHORTCUT_DEFINITIONS: Record<ShortcutId, ShortcutDefinition> = {
  search: {
    description: "Open or close LiveCard search.",
    label: "Search",
  },
  toggleNextLayer: {
    description: "Switch between LiveCards and Next Layer.",
    label: "Toggle Next Layer",
  },
}

export const SHORTCUT_ORDER: readonly ShortcutId[] = [
  "search",
  "toggleNextLayer",
]

export const DEFAULT_SHORTCUT_SETTINGS = {
  search: "Mod+K",
  toggleNextLayer: "Space",
} satisfies ShortcutSettings

export function normalizeShortcutSettings(value: unknown): ShortcutSettings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SHORTCUT_SETTINGS }
  }

  return {
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
