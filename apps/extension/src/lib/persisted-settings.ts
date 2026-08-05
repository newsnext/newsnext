import type { BackgroundArtworkTransform } from "./background-artwork-config"
import type { SourceIconSettings, SourceIconSource } from "./source-icon"
import type { ThemeMode } from "./utils/swith-theme"
import {
  DEFAULT_BACKGROUND_ARTWORK_OPACITY,
  DEFAULT_BACKGROUND_ARTWORK_TRANSFORM,
  normalizeBackgroundArtwork,
  normalizeBackgroundArtworkOpacity,
  normalizeBackgroundArtworkTransform,
} from "./background-artwork-config"
import { ALL_BOARD_ID } from "./boards"
import { DEFAULT_SOURCE_ICON_SETTINGS } from "./source-icon"

export const PERSISTED_SETTINGS_VERSION = 1

export type SettingsTabId = "appearance" | "general" | "permissions" | "data"

export interface PersistedSettings {
  appearance: {
    backgroundArtwork: string | null
    backgroundArtworkOpacity: number
    backgroundArtworkTransform: BackgroundArtworkTransform
    themeMode: ThemeMode
  }
  general: {
    defaultBoardId: string | null
    sourceIcon: SourceIconSettings
  }
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
      backgroundArtwork: null,
      backgroundArtworkOpacity: DEFAULT_BACKGROUND_ARTWORK_OPACITY,
      backgroundArtworkTransform: { ...DEFAULT_BACKGROUND_ARTWORK_TRANSFORM },
      themeMode: "system",
    },
    general: {
      defaultBoardId: ALL_BOARD_ID,
      sourceIcon: { ...DEFAULT_SOURCE_ICON_SETTINGS },
    },
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

  return {
    appearance: {
      backgroundArtwork: normalizeBackgroundArtwork(appearance?.backgroundArtwork),
      backgroundArtworkOpacity: normalizeBackgroundArtworkOpacity(appearance?.backgroundArtworkOpacity),
      backgroundArtworkTransform: normalizeBackgroundArtworkTransform(appearance?.backgroundArtworkTransform),
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

function isSettingsTabId(value: unknown): value is SettingsTabId {
  return value === "appearance"
    || value === "general"
    || value === "permissions"
    || value === "data"
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
