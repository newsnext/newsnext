export const BACKGROUND_DIAGNOSTICS_CHANGED = "newsnext.background-diagnostics.changed"

export interface BackgroundDiagnosticsChangedMessage {
  type: typeof BACKGROUND_DIAGNOSTICS_CHANGED
}

export function isBackgroundDiagnosticsChangedMessage(
  value: unknown,
): value is BackgroundDiagnosticsChangedMessage {
  return value !== null
    && typeof value === "object"
    && "type" in value
    && value.type === BACKGROUND_DIAGNOSTICS_CHANGED
}
