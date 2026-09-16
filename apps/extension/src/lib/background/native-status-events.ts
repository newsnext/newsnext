export const BACKGROUND_NATIVE_STATUS_CHANGED = "newsnext.background-native-status.changed"

export interface BackgroundNativeStatusChangedMessage {
  type: typeof BACKGROUND_NATIVE_STATUS_CHANGED
}

export function isBackgroundNativeStatusChangedMessage(
  value: unknown,
): value is BackgroundNativeStatusChangedMessage {
  return value !== null
    && typeof value === "object"
    && "type" in value
    && value.type === BACKGROUND_NATIVE_STATUS_CHANGED
}
