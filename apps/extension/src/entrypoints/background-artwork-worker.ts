/// <reference lib="webworker" />

import type {
  BackgroundArtworkWorkerRequest,
  BackgroundArtworkWorkerResponse,
} from "../lib/background-artwork-worker-protocol"
import { defineUnlistedScript } from "#imports"
import {
  createLineArtSvg,
  extractSvgLineArtMagnitude,
  extractWebpLineArtMagnitude,
  MAX_SVG_LINE_ART_DIMENSION,
  MAX_WEBP_LINE_ART_DIMENSION,
  renderWebpLineArtPixels,
  selectConnectedEdges,
} from "../lib/background-artwork-processing"

interface LineArtMagnitude {
  height: number
  magnitude: Float32Array
  width: number
}

interface SourceCache {
  file: File
  svg?: Promise<LineArtMagnitude>
  webp?: Promise<LineArtMagnitude>
}

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope
let activeSourceId = -1
let activeSource: SourceCache | undefined

export default defineUnlistedScript(() => {
  workerScope.addEventListener("message", handleMessage)
})

function handleMessage(event: MessageEvent<BackgroundArtworkWorkerRequest>): void {
  if (event.data.type === "release-source") {
    if (event.data.sourceId === activeSourceId) activeSource = undefined
    return
  }

  const request = event.data
  void processRequest(request).then((artwork) => {
    postResponse({ artwork, requestId: request.requestId })
  }).catch((error: unknown) => {
    postResponse({
      error: error instanceof Error ? error.message : "The image could not be processed.",
      requestId: request.requestId,
    })
  })
}

async function processRequest(
  request: Extract<BackgroundArtworkWorkerRequest, { type: "process" }>,
): Promise<string> {
  if (request.file) {
    activeSourceId = request.sourceId
    activeSource = { file: request.file }
  }
  if (!activeSource || request.sourceId !== activeSourceId) {
    throw new Error("The selected image is no longer available.")
  }

  if (request.format === "webp") {
    activeSource.webp ??= createWebpCache(activeSource.file)
    return createWebp(await activeSource.webp, request.threshold)
  }

  activeSource.svg ??= createSvgCache(activeSource.file)
  const cache = await activeSource.svg
  const edges = selectConnectedEdges(cache.magnitude, cache.width, cache.height, request.threshold)
  return `data:image/svg+xml;base64,${btoa(createLineArtSvg(edges, cache.width, cache.height))}`
}

async function createWebpCache(file: File): Promise<LineArtMagnitude> {
  const source = await readPixels(file, MAX_WEBP_LINE_ART_DIMENSION)
  return {
    ...source,
    magnitude: extractWebpLineArtMagnitude(source.pixels, source.width, source.height),
  }
}

async function createSvgCache(file: File): Promise<LineArtMagnitude> {
  const source = await readPixels(file, MAX_SVG_LINE_ART_DIMENSION)
  return {
    ...source,
    magnitude: extractSvgLineArtMagnitude(source.pixels, source.width, source.height),
  }
}

async function readPixels(
  file: File,
  maxDimension: number,
): Promise<{
  height: number
  pixels: Uint8ClampedArray
  width: number
}> {
  const image = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new Error("Canvas processing is unavailable.")

    context.drawImage(image, 0, 0, width, height)
    return { width, height, pixels: context.getImageData(0, 0, width, height).data }
  } finally {
    image.close()
  }
}

async function createWebp(cache: LineArtMagnitude, threshold: number): Promise<string> {
  const canvas = new OffscreenCanvas(cache.width, cache.height)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas processing is unavailable.")

  const pixels = renderWebpLineArtPixels(cache.magnitude, threshold)
  context.putImageData(new ImageData(pixels, cache.width, cache.height), 0, 0)
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.9 })
  return blobToDataUrl(blob)
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

function postResponse(response: BackgroundArtworkWorkerResponse): void {
  workerScope.postMessage(response)
}
