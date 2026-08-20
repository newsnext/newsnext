import type { Color } from "@newsnext/shared/types"
import type { BgIllustrationTransform } from "../bg-illustration/config"
import type { BoardLayer } from "../board"
import type { SourceIconSettings, SourceIconSource } from "../source/icon"
import type { ThemeMode } from "../utils/swith-theme"
import type { ShortcutSettings } from "./shortcuts"
import {
  DEFAULT_BG_ILLUSTRATION_OPACITY,
  DEFAULT_BG_ILLUSTRATION_TRANSFORM,
  normalizeBgIllustration,
  normalizeBgIllustrationOpacity,
  normalizeBgIllustrationTransform,
} from "../bg-illustration/config"
import { ALL_BOARD_ID, DEFAULT_BOARD_COLOR, DEFAULT_BOARD_LAYER, normalizeBoardLayer } from "../board"
import { DEFAULT_SOURCE_ICON_SETTINGS } from "../source/icon"
import { DEFAULT_SHORTCUT_SETTINGS, normalizeShortcutSettings } from "./shortcuts"
import { isThemeColor } from "./theme-color"

export const PERSISTED_SETTINGS_VERSION = 8

export const LIVE_CARD_HEIGHTS = ["compact", "balanced", "tall"] as const

export type LiveCardHeight = typeof LIVE_CARD_HEIGHTS[number]

export const DEFAULT_LIVE_CARD_HEIGHT: LiveCardHeight = "balanced"

export type SettingsTabId = "appearance" | "general" | "cli" | "shortcuts" | "permissions" | "data"

export interface PersistedSettings {
  appearance: {
    bgIllustration: string | null
    bgIllustrationOpacity: number
    bgIllustrationTransform: BgIllustrationTransform
    allBoardColor: Color
    allBoardDefaultLayer: BoardLayer
    liveCardHeight: LiveCardHeight
    themeMode: ThemeMode
  }
  general: {
    defaultBoardId: string | null
    sourceIcon: SourceIconSettings
  }
  shortcuts: ShortcutSettings
  version: typeof PERSISTED_SETTINGS_VERSION
}

export interface PersistedDeviceState {
  currentBoardId: string
  settingsTab: SettingsTabId
  sourceConnectionEnabled: boolean
  version: typeof PERSISTED_SETTINGS_VERSION
}

export function createDefaultPersistedSettings(): PersistedSettings {
  return {
    appearance: {
      bgIllustration: null,
      bgIllustrationOpacity: DEFAULT_BG_ILLUSTRATION_OPACITY,
      bgIllustrationTransform: { ...DEFAULT_BG_ILLUSTRATION_TRANSFORM },
      allBoardColor: DEFAULT_BOARD_COLOR,
      allBoardDefaultLayer: DEFAULT_BOARD_LAYER,
      liveCardHeight: DEFAULT_LIVE_CARD_HEIGHT,
      themeMode: "system",
    },
    general: {
      defaultBoardId: ALL_BOARD_ID,
      sourceIcon: { ...DEFAULT_SOURCE_ICON_SETTINGS },
    },
    shortcuts: { ...DEFAULT_SHORTCUT_SETTINGS },
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function createDefaultPersistedDeviceState(): PersistedDeviceState {
  return {
    currentBoardId: ALL_BOARD_ID,
    settingsTab: "appearance",
    sourceConnectionEnabled: false,
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function normalizePersistedSettings(value: unknown): PersistedSettings {
  const defaults = createDefaultPersistedSettings()
  if (!isRecord(value)) {
    return defaults
  }

  const appearance = isRecord(value.appearance) ? value.appearance : undefined
  const general = isRecord(value.general) ? value.general : undefined
  const liveCardHeight = appearance?.liveCardHeight ?? appearance?.sourceCardHeight

  return {
    appearance: {
      bgIllustration: normalizeBgIllustration(appearance?.bgIllustration),
      bgIllustrationOpacity: normalizeBgIllustrationOpacity(appearance?.bgIllustrationOpacity),
      bgIllustrationTransform: normalizeBgIllustrationTransform(appearance?.bgIllustrationTransform),
      allBoardColor: isThemeColor(appearance?.allBoardColor)
        ? appearance.allBoardColor
        : defaults.appearance.allBoardColor,
      allBoardDefaultLayer: normalizeBoardLayer(appearance?.allBoardDefaultLayer),
      liveCardHeight: isLiveCardHeight(liveCardHeight)
        ? liveCardHeight
        : defaults.appearance.liveCardHeight,
      themeMode: isThemeMode(appearance?.themeMode)
        ? appearance.themeMode
        : defaults.appearance.themeMode,
    },
    general: {
      defaultBoardId: typeof general?.defaultBoardId === "string"
        ? general.defaultBoardId
        : general?.defaultBoardId === null
          ? null
          : defaults.general.defaultBoardId,
      sourceIcon: normalizeSourceIconSettings(
        general?.sourceIcon,
        defaults.general.sourceIcon,
      ),
    },
    shortcuts: normalizeShortcutSettings(value.shortcuts),
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function normalizePersistedDeviceState(value: unknown): PersistedDeviceState {
  const defaults = createDefaultPersistedDeviceState()
  if (!isRecord(value)) {
    return defaults
  }

  return {
    currentBoardId: typeof value.currentBoardId === "string"
      ? value.currentBoardId
      : defaults.currentBoardId,
    settingsTab: isSettingsTabId(value.settingsTab)
      ? value.settingsTab
      : defaults.settingsTab,
    sourceConnectionEnabled: typeof value.sourceConnectionEnabled === "boolean"
      ? value.sourceConnectionEnabled
      : defaults.sourceConnectionEnabled,
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function withSourceConnectionEnabled(
  state: PersistedDeviceState,
  enabled: boolean,
): PersistedDeviceState {
  return {
    ...state,
    sourceConnectionEnabled: enabled,
  }
}

export function isSettingsTabId(value: unknown): value is SettingsTabId {
  return value === "appearance"
    || value === "general"
    || value === "cli"
    || value === "shortcuts"
    || value === "permissions"
    || value === "data"
}

export function isLiveCardHeight(value: unknown): value is LiveCardHeight {
  return typeof value === "string" && LIVE_CARD_HEIGHTS.includes(value as LiveCardHeight)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeSourceIconSettings(
  value: unknown,
  fallback: SourceIconSettings,
): SourceIconSettings {
  if (!isRecord(value)) {
    return { ...fallback }
  }

  return {
    source: isSourceIconSource(value.source) ? value.source : fallback.source,
    template: typeof value.template === "string" ? value.template : fallback.template,
  }
}

function isSourceIconSource(value: unknown): value is SourceIconSource {
  return value === "faviconIm"
    || value === "google"
    || value === "vemetric"
    || value === "duckDuckGo"
    || value === "custom"
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system"
}
