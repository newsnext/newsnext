import type { BackgroundArtworkTransform } from "./background-artwork-config"

const BACKGROUND_ARTWORK_DIMENSIONS_ERROR = "The background artwork dimensions are unavailable."

interface BackgroundArtworkLayout {
  height: number
  left: number
  top: number
  width: number
}

interface BackgroundArtworkTranslation {
  x: number
  y: number
}

export async function loadBackgroundArtworkAspectRatio(artwork: string): Promise<number> {
  const svgAspectRatio = readGeneratedSvgAspectRatio(artwork)
  if (svgAspectRatio !== null) return svgAspectRatio

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve(image.naturalWidth / image.naturalHeight)
      } else {
        reject(new Error(BACKGROUND_ARTWORK_DIMENSIONS_ERROR))
      }
    }, { once: true })
    image.addEventListener("error", () => {
      reject(new Error(BACKGROUND_ARTWORK_DIMENSIONS_ERROR))
    }, { once: true })
    image.src = artwork
  })
}

export function readGeneratedSvgAspectRatio(artwork: string): number | null {
  const prefix = "data:image/svg+xml;base64,"
  if (!artwork.startsWith(prefix)) return null

  try {
    const svg = atob(artwork.slice(prefix.length))
    const viewBox = svg.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i)
    const width = Number(viewBox?.[1])
    const height = Number(viewBox?.[2])
    return width > 0 && height > 0 ? width / height : null
  } catch {
    return null
  }
}

export function resolveBackgroundArtworkLayout(
  viewportWidth: number,
  viewportHeight: number,
  artworkAspectRatio: number,
): BackgroundArtworkLayout {
  const safeWidth = Math.max(viewportWidth, 1)
  const safeHeight = Math.max(viewportHeight, 1)
  const safeAspectRatio = artworkAspectRatio > 0 && Number.isFinite(artworkAspectRatio)
    ? artworkAspectRatio
    : 1
  const topInset = clamp(safeHeight * 0.1, 80, 128)
  const rightInset = clamp(-safeWidth * 0.05, -128, -48)
  const bottomInset = clamp(-safeHeight * 0.1, -128, -64)
  const leftInset = clamp(safeWidth * 0.08, 16, 128)
  const availableWidth = safeWidth - leftInset - rightInset
  const availableHeight = safeHeight - topInset - bottomInset
  const width = Math.min(availableWidth, availableHeight * safeAspectRatio)
  const height = width / safeAspectRatio

  return {
    height,
    left: safeWidth - rightInset - width,
    top: safeHeight - bottomInset - height,
    width,
  }
}

export function resolveBackgroundArtworkTranslation(
  layout: BackgroundArtworkLayout,
  viewportWidth: number,
  viewportHeight: number,
  centerX: number,
  centerY: number,
): BackgroundArtworkTranslation {
  return {
    x: centerX / 100 * viewportWidth - (layout.left + layout.width / 2),
    y: centerY / 100 * viewportHeight - (layout.top + layout.height / 2),
  }
}

export function resolveBackgroundArtworkCenter(
  layout: BackgroundArtworkLayout,
  viewportHeight: number,
  transform: BackgroundArtworkTransform,
): { x: number, y: number } {
  if (transform.positionMode === "viewport-center") {
    return { x: transform.x, y: transform.y }
  }

  const radians = transform.rotation * Math.PI / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const scaledWidth = layout.width * transform.scale
  const scaledHeight = layout.height * transform.scale
  const boundsHeight = scaledWidth * sine + scaledHeight * cosine
  return {
    x: 50,
    y: (viewportHeight - boundsHeight / 2) / viewportHeight * 100,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
