/** Protocol shared by the iframe host and extension background. */
export const WIDGET_SDK_PORT = "newsnext.widget.sdk"
export const WIDGET_STATUS_MESSAGE = "newsnext.widget.status"
export const WIDGET_SIZE_MESSAGE = "newsnext.widget.size"

/** Custom Widget views report their own empty or malformed status to the host. */
export interface WidgetStatusMessage {
  type: typeof WIDGET_STATUS_MESSAGE
  version: 1
  message: string | null
}

/** Custom Widget views report their content height so the host can size the iframe. */
export interface WidgetSizeMessage {
  type: typeof WIDGET_SIZE_MESSAGE
  version: 1
  height: number
}

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

export function isWidgetStatus(value: unknown): value is WidgetStatusMessage {
  return isRecord(value)
    && value.type === WIDGET_STATUS_MESSAGE
    && value.version === 1
    && (value.message === null || typeof value.message === "string")
}

export function isWidgetSize(value: unknown): value is WidgetSizeMessage {
  return isRecord(value)
    && value.type === WIDGET_SIZE_MESSAGE
    && value.version === 1
    && typeof value.height === "number"
    && Number.isFinite(value.height)
    && value.height >= 0
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
