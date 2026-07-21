export const TOGGLE_RADAR_OVERLAY_MESSAGE = "newsnext:toggle-radar-overlay"
export const CLOSE_RADAR_OVERLAY_MESSAGE = "newsnext:close-radar-overlay"

export interface ToggleRadarOverlayMessage {
  type: typeof TOGGLE_RADAR_OVERLAY_MESSAGE
}

export interface CloseRadarOverlayMessage {
  type: typeof CLOSE_RADAR_OVERLAY_MESSAGE
}

export function isToggleRadarOverlayMessage(
  message: unknown,
): message is ToggleRadarOverlayMessage {
  return typeof message === "object"
    && message !== null
    && "type" in message
    && message.type === TOGGLE_RADAR_OVERLAY_MESSAGE
}

export function isCloseRadarOverlayMessage(
  message: unknown,
): message is CloseRadarOverlayMessage {
  return typeof message === "object"
    && message !== null
    && "type" in message
    && message.type === CLOSE_RADAR_OVERLAY_MESSAGE
}

export function requestRadarOverlayClose(): void {
  window.parent.postMessage({ type: CLOSE_RADAR_OVERLAY_MESSAGE }, "*")
}
