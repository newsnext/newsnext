const ALPHA_THRESHOLD = 16
const MAX_ANALYSIS_DIMENSION = 128
const MAX_IMAGE_BYTES = 2_000_000
const MAX_IMAGE_SCALE = 2
const TARGET_CONTENT_RATIO = 14 / 16
const SOURCE_CACHE_LIMIT = 64

const sourceScaleCache = new Map<string, Promise<number | undefined>>()

export function getSemanticImageScale(
  src: string,
  sourceKey: string,
): Promise<number | undefined> {
  const cached = sourceScaleCache.get(sourceKey)
  if (cached) return cached

  const scale = analyzeSourceImage(src)
  sourceScaleCache.set(sourceKey, scale)
  if (sourceScaleCache.size > SOURCE_CACHE_LIMIT) {
    const oldest = sourceScaleCache.keys().next().value
    if (oldest !== undefined) sourceScaleCache.delete(oldest)
  }
  void scale.catch(() => {
    if (sourceScaleCache.get(sourceKey) === scale) {
      sourceScaleCache.delete(sourceKey)
    }
  })
  return scale
}

async function analyzeSourceImage(src: string): Promise<number | undefined> {
  const bitmap = await loadBitmap(src)

  try {
    const canvas = document.createElement("canvas")
    canvas.width = Math.min(bitmap.width, MAX_ANALYSIS_DIMENSION)
    canvas.height = Math.min(bitmap.height, MAX_ANALYSIS_DIMENSION)
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new Error("Canvas 2D context is unavailable")
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const inset = findSymmetricVerticalInset(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
    )
    if (!inset) return undefined

    const scale = calculateSymmetricImageScale(inset, canvas.height)
    return scale > 1 ? scale : undefined
  } finally {
    bitmap.close()
  }
}

export function calculateSymmetricImageScale(inset: number, height: number): number {
  const contentRatio = (height - inset * 2) / height
  return Math.min(MAX_IMAGE_SCALE, Math.max(1, TARGET_CONTENT_RATIO / contentRatio))
}

async function loadBitmap(src: string): Promise<ImageBitmap> {
  const response = await fetch(src, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
  })
  if (!response.ok) throw new Error(`Image request failed with status ${response.status}`)

  const blob = await response.blob()
  if (!blob.type.startsWith("image/") || blob.size > MAX_IMAGE_BYTES) {
    throw new Error("Image cannot be analyzed")
  }
  return createImageBitmap(blob)
}

export function findSymmetricVerticalInset(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number | undefined {
  let top: number | undefined
  let bottom = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((pixels[(y * width + x) * 4 + 3] ?? 0) <= ALPHA_THRESHOLD) continue
      top ??= y
      bottom = y + 1
      break
    }
  }

  return top === undefined ? undefined : Math.min(top, height - bottom)
}
