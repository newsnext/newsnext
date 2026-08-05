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
