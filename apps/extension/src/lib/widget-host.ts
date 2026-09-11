/** Protocol shared by the iframe host and extension background. */
export const WIDGET_SDK_PORT = "newsnext.widget.sdk"

export interface WidgetSdkRequest {
  type: typeof WIDGET_SDK_PORT
  version: 1
  request: Record<string, unknown>
}

export function isWidgetSdkRequest(value: unknown): value is WidgetSdkRequest {
  return isRecord(value)
    && value.type === WIDGET_SDK_PORT
    && value.version === 1
    && isRecord(value.request)
}

export function isWidgetSdkControl(value: unknown): value is { type: "next" | "cancel" } {
  return isRecord(value) && (value.type === "next" || value.type === "cancel")
}

export function sdkErrorFrame(error: unknown): object {
  const data = isRecord(error) && isRecord(error.data) ? error.data : undefined
  const code = isRecord(error) && typeof error.code === "string"
    ? error.code
    : typeof data?.code === "string" ? data.code : "SDK_REQUEST_FAILED"
  return {
    version: 1,
    type: "error",
    error: { code, message: error instanceof Error ? error.message : String(error) },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
