import { describe, expect, it } from "vitest"
import {
  createDefaultPersistedDeviceState,
  createDefaultPersistedSettings,
  DEFAULT_CHAT_PROVIDER_SETTINGS,
  getChatProviderPermissionOrigin,
  normalizeChatProviderSettings,
  normalizePersistedDeviceState,
  normalizePersistedSettings,
  withSourceConnectionEnabled,
} from "./persisted-settings"

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
      currentBoardId: 42,
      settingsTab: "advanced",
      sourceConnectionEnabled: "yes",
    })).toEqual(createDefaultPersistedDeviceState())
  })

  it("normalizes chat provider fields", () => {
    expect(normalizeChatProviderSettings({
      apiKey: "  secret  ",
      baseUrl: " ",
      model: " custom-model ",
      name: 42,
    })).toEqual({
      ...DEFAULT_CHAT_PROVIDER_SETTINGS,
      apiKey: "secret",
      model: "custom-model",
    })
  })

  it("creates a site-access origin from a provider URL", () => {
    expect(getChatProviderPermissionOrigin("https://api.example.com/v1/chat"))
      .toBe("https://api.example.com/*")
    expect(getChatProviderPermissionOrigin("file:///tmp/provider"))
      .toBeUndefined()
    expect(getChatProviderPermissionOrigin("not a URL"))
      .toBeUndefined()
  })
})
