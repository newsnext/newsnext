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

export type SettingsTabId = "general" | "cli" | "shortcuts" | "permissions" | "data"

export interface PersistedSettings {
  appearance: {
    localePreference: LocalePreference
    themeMode: ThemeMode
  }
  general: {
    defaultBoardId: string | null
    nativeIntegrationEnabled: boolean
    logsEnabled: boolean
    logsIssuesOnly: boolean
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
      localePreference: "system",
      themeMode: "system",
    },
    general: {
      defaultBoardId: null,
      nativeIntegrationEnabled: false,
      logsEnabled: true,
      logsIssuesOnly: false,
      sourceIcon: { ...DEFAULT_SOURCE_ICON_SETTINGS },
    },
    shortcuts: { ...DEFAULT_SHORTCUT_SETTINGS },
    version: PERSISTED_SETTINGS_VERSION,
  }
}

export function createDefaultPersistedDeviceState(currentBoardId = ""): PersistedDeviceState {
  return {
    currentBoardId,
    settingsTab: "general",
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
      nativeIntegrationEnabled: typeof general?.nativeIntegrationEnabled === "boolean"
        ? general.nativeIntegrationEnabled
        : defaults.general.nativeIntegrationEnabled,
      logsEnabled: typeof general?.logsEnabled === "boolean"
        ? general.logsEnabled
        : defaults.general.logsEnabled,
      logsIssuesOnly: typeof general?.logsIssuesOnly === "boolean"
        ? general.logsIssuesOnly
        : defaults.general.logsIssuesOnly,
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
  return value === "general"
    || value === "cli"
    || value === "shortcuts"
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
