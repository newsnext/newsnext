export const DEFAULT_BG_ILLUSTRATION_OPACITY = 7
export const MIN_BG_ILLUSTRATION_OPACITY = 1
export const MAX_BG_ILLUSTRATION_OPACITY = 20
export const MAX_BG_ILLUSTRATION_FILE_SIZE = 12 * 1024 * 1024
export const MAX_BG_ILLUSTRATION_DATA_URL_LENGTH = 1_000_000
export const MIN_BG_ILLUSTRATION_SCALE = 0.25
export const MAX_BG_ILLUSTRATION_SCALE = 4
export const DEFAULT_BG_ILLUSTRATION_TRANSFORM: BgIllustrationTransform = {
  positionMode: "bottom-center",
  x: 50,
  y: 100,
  scale: 1,
  rotation: 0,
}

export interface BgIllustrationTransform {
  positionMode: "bottom-center" | "viewport-center"
  rotation: number
  scale: number
  x: number
  y: number
}

const SVG_DATA_URL_PREFIX = "data:image/svg+xml,"

export function createSvgIllustrationDataUrl(svg: string): string | null {
  if (!isSvgMarkup(svg)) return null

  const illustration = `${SVG_DATA_URL_PREFIX}${encodeURIComponent(svg)}`
  return illustration.length <= MAX_BG_ILLUSTRATION_DATA_URL_LENGTH ? illustration : null
}

export function decodeSvgIllustrationDataUrl(illustration: string): string | null {
  if (illustration.length > MAX_BG_ILLUSTRATION_DATA_URL_LENGTH
    || !illustration.startsWith(SVG_DATA_URL_PREFIX)) {
    return null
  }

  const payload = illustration.slice(SVG_DATA_URL_PREFIX.length)
  try {
    const svg = decodeURIComponent(payload)
    return isSvgMarkup(svg) && encodeURIComponent(svg) === payload ? svg : null
  } catch {
    return null
  }
}

function isSvgMarkup(svg: string): boolean {
  const rootBoundary = svg[4]
  return svg.startsWith("<svg")
    && (rootBoundary === ">"
      || rootBoundary === "/"
      || (rootBoundary !== undefined && /\s/u.test(rootBoundary)))
    && svg.endsWith(">")
}

export function normalizeBgIllustrationOpacity(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_BG_ILLUSTRATION_OPACITY, Math.max(MIN_BG_ILLUSTRATION_OPACITY, Math.round(value)))
    : DEFAULT_BG_ILLUSTRATION_OPACITY
}

export function normalizeBgIllustrationTransform(value: unknown): BgIllustrationTransform {
  if (!isRecord(value)) return { ...DEFAULT_BG_ILLUSTRATION_TRANSFORM }

  const hasViewportCenter = value.positionMode === "viewport-center"
  return {
    positionMode: hasViewportCenter ? "viewport-center" : "bottom-center",
    x: hasViewportCenter
      ? normalizeNumber(value.x, -100, 200, DEFAULT_BG_ILLUSTRATION_TRANSFORM.x)
      : DEFAULT_BG_ILLUSTRATION_TRANSFORM.x,
    y: hasViewportCenter
      ? normalizeNumber(value.y, -100, 200, DEFAULT_BG_ILLUSTRATION_TRANSFORM.y)
      : DEFAULT_BG_ILLUSTRATION_TRANSFORM.y,
    scale: normalizeNumber(
      value.scale,
      MIN_BG_ILLUSTRATION_SCALE,
      MAX_BG_ILLUSTRATION_SCALE,
      DEFAULT_BG_ILLUSTRATION_TRANSFORM.scale,
    ),
    rotation: normalizeNumber(
      value.rotation,
      -180,
      180,
      DEFAULT_BG_ILLUSTRATION_TRANSFORM.rotation,
    ),
  }
}

export function areBgIllustrationTransformsEqual(
  left: BgIllustrationTransform,
  right: BgIllustrationTransform,
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
