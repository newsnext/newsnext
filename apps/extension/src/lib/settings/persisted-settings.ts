import type { LocalePreference } from "../i18n/locale"
import type { SourceIconSettings, SourceIconSource } from "../source/icon"
import type { ThemeMode } from "../utils/swith-theme"
import type { ShortcutSettings } from "./shortcuts"
import { isLocalePreference } from "../i18n/locale"
import {
  DEFAULT_SOURCE_ICON_SETTINGS,
} from "../source/icon"
import { DEFAULT_SHORTCUT_SETTINGS, normalizeShortcutSettings } from "./shortcuts"

export const PERSISTED_SETTINGS_VERSION = 1

export const LIVE_CARD_HEIGHTS = ["compact", "balanced", "tall"] as const

export type LiveCardHeight = typeof LIVE_CARD_HEIGHTS[number]

export const DEFAULT_LIVE_CARD_HEIGHT: LiveCardHeight = "balanced"

export const MAX_REGISTRY_URLS = 20

export type SettingsTabId = "appearance" | "general" | "registry" | "cli" | "shortcuts" | "permissions" | "data"

export interface PersistedSettings {
  appearance: {
    liveCardHeight: LiveCardHeight
    localePreference: LocalePreference
    themeMode: ThemeMode
  }
  general: {
    defaultBoardId: string | null
    // Keep this persisted property name stable for existing browser profiles.
    appIntegrationEnabled: boolean
    registryUrls: string[]
    sourceIcon: SourceIconSettings
  }
  shortcuts: ShortcutSettings
  version: typeof PERSISTED_SETTINGS_VERSION
}

export interface PersistedDeviceState {
  currentBoardId: string
  settingsTab: SettingsTabId
  version: typeof PERSISTED_SETTINGS_VERSION
}

export function createDefaultPersistedSettings(): PersistedSettings {
  return {
    appearance: {
      liveCardHeight: DEFAULT_LIVE_CARD_HEIGHT,
      localePreference: "system",
      themeMode: "system",
    },
    general: {
      defaultBoardId: null,
      appIntegrationEnabled: false,
      registryUrls: [],
      sourceIcon: { ...DEFAULT_SOURCE_ICON_SETTINGS },
    },
    shortcuts: { ...DEFAULT_SHORTCUT_SETTINGS },
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function createDefaultPersistedDeviceState(currentBoardId = ""): PersistedDeviceState {
  return {
    currentBoardId,
    settingsTab: "appearance",
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function normalizePersistedSettings(value: unknown): PersistedSettings {
  const defaults = createDefaultPersistedSettings()
  if (!isRecord(value) || value.version !== PERSISTED_SETTINGS_VERSION) {
    return defaults
  }

  const appearance = isRecord(value.appearance) ? value.appearance : undefined
  const general = isRecord(value.general) ? value.general : undefined
  return {
    appearance: {
      liveCardHeight: isLiveCardHeight(appearance?.liveCardHeight)
        ? appearance.liveCardHeight
        : defaults.appearance.liveCardHeight,
      localePreference: isLocalePreference(appearance?.localePreference)
        ? appearance.localePreference
        : defaults.appearance.localePreference,
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
      appIntegrationEnabled: typeof general?.appIntegrationEnabled === "boolean"
        ? general.appIntegrationEnabled
        : defaults.general.appIntegrationEnabled,
      registryUrls: normalizeRegistryUrls(general?.registryUrls),
      sourceIcon: normalizeSourceIconSettings(
        general?.sourceIcon,
        defaults.general.sourceIcon,
      ),
    },
    shortcuts: normalizeShortcutSettings(value.shortcuts),
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function normalizeRegistryUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return undefined

  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined
    return new TextEncoder().encode(url.href).length <= 2048 ? url.href : undefined
  } catch {
    return undefined
  }
}

export function normalizeRegistryUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const urls = new Set<string>()
  for (const candidate of value) {
    const url = normalizeRegistryUrl(candidate)
    if (url) urls.add(url)
    if (urls.size === MAX_REGISTRY_URLS) break
  }
  return [...urls]
}

export function normalizePersistedDeviceState(value: unknown): PersistedDeviceState {
  const defaults = createDefaultPersistedDeviceState()
  if (!isRecord(value) || value.version !== PERSISTED_SETTINGS_VERSION) {
    return defaults
  }

  return {
    currentBoardId: typeof value.currentBoardId === "string"
      ? value.currentBoardId
      : defaults.currentBoardId,
    settingsTab: isSettingsTabId(value.settingsTab)
      ? value.settingsTab
      : defaults.settingsTab,
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function isSettingsTabId(value: unknown): value is SettingsTabId {
  return value === "appearance"
    || value === "general"
    || value === "registry"
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
