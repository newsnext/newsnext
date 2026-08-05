export const DEFAULT_BACKGROUND_ARTWORK_OPACITY = 7
export const MIN_BACKGROUND_ARTWORK_OPACITY = 1
export const MAX_BACKGROUND_ARTWORK_OPACITY = 20
export const MAX_BACKGROUND_ARTWORK_FILE_SIZE = 12 * 1024 * 1024
export const MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH = 1_000_000
export const MIN_BACKGROUND_ARTWORK_SCALE = 0.25
export const MAX_BACKGROUND_ARTWORK_SCALE = 4
export const DEFAULT_BACKGROUND_ARTWORK_TRANSFORM: BackgroundArtworkTransform = {
  positionMode: "bottom-center",
  x: 50,
  y: 100,
  scale: 1,
  rotation: 0,
}

export interface BackgroundArtworkTransform {
  positionMode: "bottom-center" | "viewport-center"
  rotation: number
  scale: number
  x: number
  y: number
}

const WEBP_DATA_URL_PATTERN = /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/
const SVG_DATA_URL_PATTERN = /^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/

export function normalizeBackgroundArtwork(value: unknown): string | null {
  return typeof value === "string"
    && value.length <= MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH
    && (SVG_DATA_URL_PATTERN.test(value) || WEBP_DATA_URL_PATTERN.test(value))
    ? value
    : null
}

export function normalizeBackgroundArtworkOpacity(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_BACKGROUND_ARTWORK_OPACITY, Math.max(MIN_BACKGROUND_ARTWORK_OPACITY, Math.round(value)))
    : DEFAULT_BACKGROUND_ARTWORK_OPACITY
}

export function normalizeBackgroundArtworkTransform(value: unknown): BackgroundArtworkTransform {
  if (!isRecord(value)) return { ...DEFAULT_BACKGROUND_ARTWORK_TRANSFORM }

  const hasViewportCenter = value.positionMode === "viewport-center"
  return {
    positionMode: hasViewportCenter ? "viewport-center" : "bottom-center",
    x: hasViewportCenter
      ? normalizeNumber(value.x, -100, 200, DEFAULT_BACKGROUND_ARTWORK_TRANSFORM.x)
      : DEFAULT_BACKGROUND_ARTWORK_TRANSFORM.x,
    y: hasViewportCenter
      ? normalizeNumber(value.y, -100, 200, DEFAULT_BACKGROUND_ARTWORK_TRANSFORM.y)
      : DEFAULT_BACKGROUND_ARTWORK_TRANSFORM.y,
    scale: normalizeNumber(
      value.scale,
      MIN_BACKGROUND_ARTWORK_SCALE,
      MAX_BACKGROUND_ARTWORK_SCALE,
      DEFAULT_BACKGROUND_ARTWORK_TRANSFORM.scale,
    ),
    rotation: normalizeNumber(
      value.rotation,
      -180,
      180,
      DEFAULT_BACKGROUND_ARTWORK_TRANSFORM.rotation,
    ),
  }
}

export function areBackgroundArtworkTransformsEqual(
  left: BackgroundArtworkTransform,
  right: BackgroundArtworkTransform,
): boolean {
  return left.positionMode === right.positionMode
    && left.x === right.x
    && left.y === right.y
    && left.scale === right.scale
    && left.rotation === right.rotation
}

function normalizeNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
