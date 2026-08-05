export const DEFAULT_LINE_ART_THRESHOLD = 36
export const MAX_BACKGROUND_ARTWORK_FILE_SIZE = 12 * 1024 * 1024
export const MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH = 1_000_000

const MAX_LINE_ART_DIMENSION = 1400
const WEBP_DATA_URL_PATTERN = /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/

export function normalizeBackgroundArtwork(value: unknown): string | null {
  return typeof value === "string"
    && value.length <= MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH
    && WEBP_DATA_URL_PATTERN.test(value)
    ? value
    : null
}

export function extractLineArtPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
): Uint8ClampedArray<ArrayBuffer> {
  const grayscale = new Float32Array(width * height)
  for (let index = 0; index < grayscale.length; index += 1) {
    const pixelIndex = index * 4
    grayscale[index] = (
      (pixels[pixelIndex] ?? 0) * 0.2126
      + (pixels[pixelIndex + 1] ?? 0) * 0.7152
      + (pixels[pixelIndex + 2] ?? 0) * 0.0722
    )
  }

  const output = new Uint8ClampedArray(new ArrayBuffer(pixels.length))
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const topLeft = grayscale[index - width - 1] ?? 0
      const top = grayscale[index - width] ?? 0
      const topRight = grayscale[index - width + 1] ?? 0
      const left = grayscale[index - 1] ?? 0
      const right = grayscale[index + 1] ?? 0
      const bottomLeft = grayscale[index + width - 1] ?? 0
      const bottom = grayscale[index + width] ?? 0
      const bottomRight = grayscale[index + width + 1] ?? 0
      const gradientX = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight
      const gradientY = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight
      const magnitude = Math.hypot(gradientX, gradientY) / 4
      const alpha = Math.min(255, Math.max(0, (magnitude - threshold) * 5))
      const pixelIndex = index * 4
      output[pixelIndex + 3] = alpha
    }
  }

  return output
}

export async function createBackgroundLineArt(
  file: File,
  threshold: number,
): Promise<string> {
  const image = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const scale = Math.min(1, MAX_LINE_ART_DIMENSION / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) {
      throw new Error("Canvas processing is unavailable.")
    }

    context.drawImage(image, 0, 0, width, height)
    const source = context.getImageData(0, 0, width, height)
    const lineArt = extractLineArtPixels(source.data, width, height, threshold)
    context.putImageData(new ImageData(lineArt, width, height), 0, 0)
    const artwork = await blobToDataUrl(await canvasToBlob(canvas))
    if (!normalizeBackgroundArtwork(artwork)) {
      throw new Error("The processed image is too detailed. Try a simpler image.")
    }
    return artwork
  } finally {
    image.close()
  }
}

export function applyBackgroundArtwork(artwork: string | null): void {
  if (typeof document === "undefined") return

  document.body?.classList.toggle("background-artwork-active", artwork !== null)
  if (artwork) {
    document.documentElement.style.setProperty(
      "--app-background-artwork",
      `url("${artwork}")`,
    )
  } else {
    document.documentElement.style.removeProperty("--app-background-artwork")
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("The browser could not encode the processed image."))
    }, "image/webp", 0.9)
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("The processed image could not be read."))
    }, { once: true })
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Image reading failed.")), { once: true })
    reader.readAsDataURL(blob)
  })
}
