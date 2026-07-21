import { describe, expect, it } from "vitest"
import {
  CLOSE_RADAR_OVERLAY_MESSAGE,
  isCloseRadarOverlayMessage,
  isToggleRadarOverlayMessage,
  TOGGLE_RADAR_OVERLAY_MESSAGE,
} from "./radar-overlay-message"

describe("radar overlay messages", () => {
  it("distinguishes close and toggle messages", () => {
    expect(isCloseRadarOverlayMessage({ type: CLOSE_RADAR_OVERLAY_MESSAGE })).toBe(true)
    expect(isCloseRadarOverlayMessage({ type: TOGGLE_RADAR_OVERLAY_MESSAGE })).toBe(false)
    expect(isToggleRadarOverlayMessage({ type: TOGGLE_RADAR_OVERLAY_MESSAGE })).toBe(true)
    expect(isToggleRadarOverlayMessage({ type: CLOSE_RADAR_OVERLAY_MESSAGE })).toBe(false)
  })

  it("rejects malformed messages", () => {
    expect(isCloseRadarOverlayMessage(null)).toBe(false)
    expect(isCloseRadarOverlayMessage(CLOSE_RADAR_OVERLAY_MESSAGE)).toBe(false)
    expect(isCloseRadarOverlayMessage({})).toBe(false)
  })
})
