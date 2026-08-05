export const DEFAULT_BACKGROUND_ARTWORK_OPACITY = 7
export const MIN_BACKGROUND_ARTWORK_OPACITY = 1
export const MAX_BACKGROUND_ARTWORK_OPACITY = 20
export const MAX_BACKGROUND_ARTWORK_FILE_SIZE = 12 * 1024 * 1024
export const MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH = 1_000_000

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
