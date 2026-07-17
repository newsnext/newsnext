export const TOGGLE_RADAR_OVERLAY_MESSAGE = "newsnext:toggle-radar-overlay"

export interface ToggleRadarOverlayMessage {
  type: typeof TOGGLE_RADAR_OVERLAY_MESSAGE
}

export function isToggleRadarOverlayMessage(
  message: unknown,
): message is ToggleRadarOverlayMessage {
  return typeof message === "object"
    && message !== null
    && "type" in message
    && message.type === TOGGLE_RADAR_OVERLAY_MESSAGE
}
