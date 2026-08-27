import { describe, expect, it } from "vitest"
import {
  createDefaultPersistedDeviceState,
  createDefaultPersistedSettings,
  normalizePersistedDeviceState,
  normalizePersistedSettings,
  withAppIntegrationEnabled,
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

  it("normalizes the LiveCard height", () => {
    expect(normalizePersistedSettings({
      appearance: { liveCardHeight: "compact" },
      version: 1,
    }).appearance.liveCardHeight).toBe("compact")
    expect(normalizePersistedSettings({
      appearance: { liveCardHeight: "tall" },
      version: 1,
    }).appearance.liveCardHeight).toBe("tall")
    expect(normalizePersistedSettings({
      appearance: { liveCardHeight: "giant" },
      version: 1,
    }).appearance.liveCardHeight).toBe("balanced")
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

  it("updates the App integration preference without changing other settings", () => {
    const settings = createDefaultPersistedSettings()
    settings.general.defaultBoardId = "reading"

    expect(withAppIntegrationEnabled(settings, true)).toEqual({
      ...settings,
      general: {
        ...settings.general,
        appIntegrationEnabled: true,
      },
    })
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
})
