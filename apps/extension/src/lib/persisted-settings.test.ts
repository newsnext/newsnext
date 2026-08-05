import { describe, expect, it } from "vitest"
import {
  createDefaultPersistedDeviceState,
  createDefaultPersistedSettings,
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

  it("keeps a valid locally generated background artwork image", () => {
    const artwork = "data:image/webp;base64,AAAA"
    expect(normalizePersistedSettings({
      appearance: { backgroundArtwork: artwork },
    }).appearance.backgroundArtwork).toBe(artwork)
  })

  it("normalizes the background artwork opacity", () => {
    expect(normalizePersistedSettings({
      appearance: { backgroundArtworkOpacity: 12.4 },
    }).appearance.backgroundArtworkOpacity).toBe(12)
    expect(normalizePersistedSettings({
      appearance: { backgroundArtworkOpacity: 100 },
    }).appearance.backgroundArtworkOpacity).toBe(20)
  })

  it("normalizes the background artwork transform", () => {
    expect(normalizePersistedSettings({
      appearance: {
        backgroundArtworkTransform: {
          positionMode: "viewport-center",
          x: 12.345,
          y: -500,
          scale: 10,
          rotation: "sideways",
        },
      },
    }).appearance.backgroundArtworkTransform).toEqual({
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
})
