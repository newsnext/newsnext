import { describe, expect, it } from "vitest"
import {
  createDefaultPersistedDeviceState,
  createDefaultPersistedSettings,
  normalizePersistedDeviceState,
  normalizePersistedSettings,
  withSourceConnectionEnabled,
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

  it("keeps valid locally generated SVG background illustration", () => {
    const illustration = `data:image/svg+xml,${encodeURIComponent("<svg></svg>")}`
    expect(normalizePersistedSettings({
      appearance: { bgIllustration: illustration },
    }).appearance.bgIllustration).toBe(illustration)
  })

  it("normalizes the All board color", () => {
    expect(normalizePersistedSettings({
      appearance: { allBoardColor: "blue" },
    }).appearance.allBoardColor).toBe("blue")
    expect(normalizePersistedSettings({
      appearance: { allBoardColor: "invalid" },
    }).appearance.allBoardColor).toBe("red")
  })

  it("normalizes the source card height", () => {
    expect(normalizePersistedSettings({
      appearance: { sourceCardHeight: "compact" },
    }).appearance.sourceCardHeight).toBe("compact")
    expect(normalizePersistedSettings({
      appearance: { sourceCardHeight: "tall" },
    }).appearance.sourceCardHeight).toBe("tall")
    expect(normalizePersistedSettings({
      appearance: { sourceCardHeight: "giant" },
    }).appearance.sourceCardHeight).toBe("balanced")
  })

  it("normalizes the background illustration opacity", () => {
    expect(normalizePersistedSettings({
      appearance: { bgIllustrationOpacity: 12.4 },
    }).appearance.bgIllustrationOpacity).toBe(12)
    expect(normalizePersistedSettings({
      appearance: { bgIllustrationOpacity: 100 },
    }).appearance.bgIllustrationOpacity).toBe(20)
  })

  it("normalizes the background illustration transform", () => {
    expect(normalizePersistedSettings({
      appearance: {
        bgIllustrationTransform: {
          positionMode: "viewport-center",
          x: 12.345,
          y: -500,
          scale: 10,
          rotation: "sideways",
        },
      },
    }).appearance.bgIllustrationTransform).toEqual({
      positionMode: "viewport-center",
      x: 12.35,
      y: -100,
      scale: 4,
      rotation: 0,
    })
  })

  it("normalizes keyboard shortcuts", () => {
    expect(normalizePersistedSettings({
      shortcuts: { search: "Mod+F", toggleNextLayer: "Mod+Shift+L" },
    }).shortcuts).toEqual({
      ...DEFAULT_SHORTCUT_SETTINGS,
      search: "Mod+F",
      toggleNextLayer: "Mod+Shift+L",
    })
    expect(normalizePersistedSettings({
      shortcuts: { toggleNextLayer: null },
    }).shortcuts.toggleNextLayer).toBeNull()
    expect(normalizePersistedSettings({
      shortcuts: { search: "esc" },
    }).shortcuts.search).toBe("Escape")
    expect(normalizePersistedSettings({
      shortcuts: { search: "Not+A+Hotkey", toggleNextLayer: "Not+A+Hotkey" },
    }).shortcuts).toEqual(DEFAULT_SHORTCUT_SETTINGS)
  })

  it("updates the CLI preference without changing other settings", () => {
    const state = createDefaultPersistedDeviceState()
    state.currentBoardId = "reading"

    expect(withSourceConnectionEnabled(state, true)).toEqual({
      ...state,
      sourceConnectionEnabled: true,
    })
  })

  it("normalizes invalid device-only fields", () => {
    expect(normalizePersistedDeviceState({
      chatProvider: {
        apiKey: "legacy-secret",
        baseUrl: "https://api.example.com/v1",
        model: "legacy-model",
        name: "Legacy provider",
      },
      currentBoardId: 42,
      settingsTab: "advanced",
      sourceConnectionEnabled: "yes",
    })).toEqual(createDefaultPersistedDeviceState())
  })
})
