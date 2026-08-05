/// <reference lib="webworker" />

import type {
  BgIllustrationWorkerRequest,
  BgIllustrationWorkerResponse,
} from "../lib/bg-illustration/worker-protocol"
import { defineUnlistedScript } from "#imports"
import { createSvgIllustrationDataUrl } from "../lib/bg-illustration/config"
import {
  createLineArtSvg,
  extractSvgLineArtMagnitude,
  MAX_SVG_LINE_ART_DIMENSION,
  selectConnectedEdges,
} from "../lib/bg-illustration/processing"

interface LineArtMagnitude {
  height: number
  magnitude: Float32Array
  width: number
}

interface SourceCache {
  file: File
  magnitude?: Promise<LineArtMagnitude>
}

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope
let activeSourceId = -1
let activeSource: SourceCache | undefined

export default defineUnlistedScript(() => {
  workerScope.addEventListener("message", handleMessage)
})

function handleMessage(event: MessageEvent<BgIllustrationWorkerRequest>): void {
  if (event.data.type === "release-source") {
    if (event.data.sourceId === activeSourceId) activeSource = undefined
    return
  }

  const request = event.data
  void processRequest(request).then((illustration) => {
    postResponse({ illustration, requestId: request.requestId })
  }).catch((error: unknown) => {
    postResponse({
      error: error instanceof Error ? error.message : "The image could not be processed.",
      requestId: request.requestId,
    })
  })
}

async function processRequest(
  request: Extract<BgIllustrationWorkerRequest, { type: "process" }>,
): Promise<string> {
  if (request.file) {
    activeSourceId = request.sourceId
    activeSource = { file: request.file }
  }
  if (!activeSource || request.sourceId !== activeSourceId) {
    throw new Error("The selected image is no longer available.")
  }

  activeSource.magnitude ??= createMagnitudeCache(activeSource.file)
  const cache = await activeSource.magnitude
  const edges = selectConnectedEdges(cache.magnitude, cache.width, cache.height, request.threshold)
  const illustration = createSvgIllustrationDataUrl(createLineArtSvg(edges, cache.width, cache.height))
  if (!illustration) throw new Error("The processed image is too detailed. Try a simpler image.")
  return illustration
}

async function createMagnitudeCache(file: File): Promise<LineArtMagnitude> {
  const source = await readPixels(file)
  return {
    ...source,
    magnitude: extractSvgLineArtMagnitude(source.pixels, source.width, source.height),
  }
}

async function readPixels(file: File): Promise<{
  height: number
  pixels: Uint8ClampedArray
  width: number
}> {
  const image = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const scale = Math.min(1, MAX_SVG_LINE_ART_DIMENSION / Math.max(image.width, image.height))
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

function postResponse(response: BgIllustrationWorkerResponse): void {
  workerScope.postMessage(response)
}
