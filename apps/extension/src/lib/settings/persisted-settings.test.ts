import { describe, expect, it } from "vitest"
import {
  createDefaultPersistedDeviceState,
  createDefaultPersistedSettings,
  normalizePersistedDeviceState,
  normalizePersistedSettings,
} from "./persisted-settings"
import { DEFAULT_SHORTCUT_SETTINGS } from "./shortcuts"

describe("persisted settings", () => {
  it("normalizes invalid imported fields to their defaults", () => {
    const settings = normalizePersistedSettings({
      appearance: { themeMode: "sepia" },
      general: {
        defaultBoardId: 42,
        sourceIcon: { source: "unknown", template: false },
      },
      version: 99,
    })

    expect(settings).toEqual(createDefaultPersistedSettings())
  })

  it("normalizes keyboard shortcuts", () => {
    expect(normalizePersistedSettings({
      shortcuts: { search: "Mod+F", toggleNextLayer: "Mod+Shift+L" },
      version: 1,
    }).shortcuts).toEqual({
      ...DEFAULT_SHORTCUT_SETTINGS,
      search: "Mod+F",
      toggleNextLayer: "Mod+Shift+L",
    })
    expect(normalizePersistedSettings({
      shortcuts: { toggleNextLayer: null },
      version: 1,
    }).shortcuts.toggleNextLayer).toBeNull()
    expect(normalizePersistedSettings({
      shortcuts: { search: "esc" },
      version: 1,
    }).shortcuts.search).toBe("Escape")
    expect(normalizePersistedSettings({
      shortcuts: { search: "Not+A+Hotkey", toggleNextLayer: "Not+A+Hotkey" },
      version: 1,
    }).shortcuts).toEqual(DEFAULT_SHORTCUT_SETTINGS)
  })

  it("normalizes invalid device-only fields", () => {
    expect(normalizePersistedDeviceState({
      currentBoardId: 42,
      settingsTab: "advanced",
      version: 1,
    })).toEqual(createDefaultPersistedDeviceState())
  })

  it("keeps the Integration settings tab", () => {
    expect(normalizePersistedDeviceState({ settingsTab: "cli", version: 1 }).settingsTab).toBe("cli")
  })

  it("normalizes the daemon log switch", () => {
    expect(normalizePersistedSettings({
      general: { logsEnabled: false, logsIssuesOnly: true },
      version: 1,
    }).general).toMatchObject({ logsEnabled: false, logsIssuesOnly: true })
    expect(normalizePersistedSettings({
      general: { logsEnabled: "yes", logsIssuesOnly: 1 },
      version: 1,
    }).general).toMatchObject({ logsEnabled: true, logsIssuesOnly: false })
  })

  it("normalizes the synchronized locale preference", () => {
    expect(normalizePersistedSettings({
      appearance: { localePreference: "zh-TW" },
      version: 1,
    }).appearance.localePreference).toBe("zh-TW")
    expect(normalizePersistedSettings({
      appearance: { localePreference: "fr" },
      version: 1,
    }).appearance.localePreference).toBe("system")
  })
})
