import type { BackgroundArtworkFormat } from "./background-artwork-processing"
import type {
  BackgroundArtworkWorkerRequest,
  BackgroundArtworkWorkerResponse,
} from "./background-artwork-worker-protocol"
import { browser } from "#imports"
import {
  DEFAULT_BACKGROUND_ARTWORK_OPACITY,
  normalizeBackgroundArtwork,
  normalizeBackgroundArtworkOpacity,
} from "./background-artwork-config"

export {
  DEFAULT_BACKGROUND_ARTWORK_OPACITY,
  MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH,
  MAX_BACKGROUND_ARTWORK_FILE_SIZE,
  MAX_BACKGROUND_ARTWORK_OPACITY,
  MIN_BACKGROUND_ARTWORK_OPACITY,
  normalizeBackgroundArtwork,
  normalizeBackgroundArtworkOpacity,
} from "./background-artwork-config"
export type { BackgroundArtworkFormat } from "./background-artwork-processing"
export {
  DEFAULT_LINE_ART_THRESHOLD,
} from "./background-artwork-processing"

interface PendingWorkerRequest {
  reject: (reason: Error) => void
  resolve: (artwork: string) => void
}

let artworkWorker: Worker | undefined
let activeSourceFile: File | undefined
let activeSourceId = 0
let nextRequestId = 0
const pendingWorkerRequests = new Map<number, PendingWorkerRequest>()

export function createBackgroundLineArt(
  file: File,
  threshold: number,
  format: BackgroundArtworkFormat,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = getArtworkWorker()
    } catch (error: unknown) {
      reject(error instanceof Error ? error : new Error("Background artwork processing is unavailable."))
      return
    }

    const requestId = nextRequestId + 1
    nextRequestId = requestId
    let workerFile: File | undefined
    if (activeSourceFile !== file) {
      activeSourceFile = file
      activeSourceId += 1
      workerFile = file
    }

    pendingWorkerRequests.set(requestId, { resolve, reject })
    const request: BackgroundArtworkWorkerRequest = {
      type: "process",
      requestId,
      sourceId: activeSourceId,
      threshold,
      format,
      ...(workerFile ? { file: workerFile } : {}),
    }
    try {
      worker.postMessage(request)
    } catch (error: unknown) {
      pendingWorkerRequests.delete(requestId)
      reject(error instanceof Error ? error : new Error("The image could not be sent for processing."))
    }
  })
}

export function releaseBackgroundArtworkSource(file: File): void {
  if (!artworkWorker || activeSourceFile !== file) return

  try {
    artworkWorker.postMessage({
      type: "release-source",
      sourceId: activeSourceId,
    } satisfies BackgroundArtworkWorkerRequest)
  } catch {
    handleWorkerError()
  }
  activeSourceFile = undefined
}

export function applyBackgroundArtwork(
  artwork: string | null,
  opacity = DEFAULT_BACKGROUND_ARTWORK_OPACITY,
): void {
  if (typeof document === "undefined") return

  document.body?.classList.toggle("background-artwork-active", artwork !== null)
  document.documentElement.style.setProperty(
    "--app-background-artwork-opacity",
    `${normalizeBackgroundArtworkOpacity(opacity)}%`,
  )
  if (artwork) {
    document.documentElement.style.setProperty(
      "--app-background-artwork",
      `url("${artwork}")`,
    )
  } else {
    document.documentElement.style.removeProperty("--app-background-artwork")
  }
}

function getArtworkWorker(): Worker {
  if (artworkWorker) return artworkWorker

  artworkWorker = new Worker(browser.runtime.getURL("/background-artwork-worker.js"))
  artworkWorker.addEventListener("message", handleWorkerMessage)
  artworkWorker.addEventListener("error", handleWorkerError)
  artworkWorker.addEventListener("messageerror", handleWorkerError)
  return artworkWorker
}

function handleWorkerMessage(event: MessageEvent<BackgroundArtworkWorkerResponse>): void {
  const pending = pendingWorkerRequests.get(event.data.requestId)
  if (!pending) return

  pendingWorkerRequests.delete(event.data.requestId)
  if ("error" in event.data) {
    pending.reject(new Error(event.data.error))
    return
  }

  const artwork = normalizeBackgroundArtwork(event.data.artwork)
  if (artwork) pending.resolve(artwork)
  else pending.reject(new Error("The processed image is too detailed. Try a simpler image."))
}

function handleWorkerError(): void {
  const error = new Error("Background artwork processing stopped unexpectedly.")
  for (const pending of pendingWorkerRequests.values()) pending.reject(error)
  pendingWorkerRequests.clear()
  artworkWorker?.terminate()
  artworkWorker = undefined
  activeSourceFile = undefined
}
