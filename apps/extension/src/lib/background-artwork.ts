import type { BackgroundArtworkTransform } from "./background-artwork-config"
import type { BackgroundArtworkFormat } from "./background-artwork-processing"
import type {
  BackgroundArtworkWorkerRequest,
  BackgroundArtworkWorkerResponse,
} from "./background-artwork-worker-protocol"
import { browser } from "#imports"
import {
  areBackgroundArtworkTransformsEqual,
  DEFAULT_BACKGROUND_ARTWORK_OPACITY,
  DEFAULT_BACKGROUND_ARTWORK_TRANSFORM,
  normalizeBackgroundArtwork,
  normalizeBackgroundArtworkOpacity,
  normalizeBackgroundArtworkTransform,
} from "./background-artwork-config"
import {
  loadBackgroundArtworkAspectRatio,
  resolveBackgroundArtworkCenter,
  resolveBackgroundArtworkLayout,
  resolveBackgroundArtworkTranslation,
} from "./background-artwork-layout"

export {
  areBackgroundArtworkTransformsEqual,
  DEFAULT_BACKGROUND_ARTWORK_OPACITY,
  DEFAULT_BACKGROUND_ARTWORK_TRANSFORM,
  MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH,
  MAX_BACKGROUND_ARTWORK_FILE_SIZE,
  MAX_BACKGROUND_ARTWORK_OPACITY,
  MAX_BACKGROUND_ARTWORK_SCALE,
  MIN_BACKGROUND_ARTWORK_OPACITY,
  MIN_BACKGROUND_ARTWORK_SCALE,
  normalizeBackgroundArtwork,
  normalizeBackgroundArtworkOpacity,
  normalizeBackgroundArtworkTransform,
} from "./background-artwork-config"
export type { BackgroundArtworkTransform } from "./background-artwork-config"
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
let appliedArtwork: string | null = null
let appliedArtworkAspectRatio: number | null = null
let appliedArtworkTransform: BackgroundArtworkTransform = DEFAULT_BACKGROUND_ARTWORK_TRANSFORM
let artworkLayoutRequestId = 0
let isArtworkResizeListenerActive = false

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
  transform: BackgroundArtworkTransform = DEFAULT_BACKGROUND_ARTWORK_TRANSFORM,
): void {
  if (typeof document === "undefined") return

  document.body?.classList.toggle("background-artwork-active", artwork !== null)
  document.documentElement.style.setProperty(
    "--app-background-artwork-opacity",
    `${normalizeBackgroundArtworkOpacity(opacity)}%`,
  )
  const normalizedTransform = normalizeBackgroundArtworkTransform(transform)
  const hasTransformChanged = !areBackgroundArtworkTransformsEqual(
    appliedArtworkTransform,
    normalizedTransform,
  )
  appliedArtworkTransform = normalizedTransform
  document.documentElement.style.setProperty("--app-background-artwork-scale", `${normalizedTransform.scale}`)
  document.documentElement.style.setProperty("--app-background-artwork-rotation", `${normalizedTransform.rotation}deg`)
  if (artwork) {
    document.documentElement.style.setProperty(
      "--app-background-artwork",
      `url("${artwork}")`,
    )
    if (artwork !== appliedArtwork) {
      appliedArtwork = artwork
      appliedArtworkAspectRatio = null
      clearAppliedArtworkLayout()
      artworkLayoutRequestId += 1
      const requestId = artworkLayoutRequestId
      ensureArtworkResizeListener()
      void loadBackgroundArtworkAspectRatio(artwork).then((aspectRatio) => {
        if (requestId !== artworkLayoutRequestId || appliedArtwork !== artwork) return
        appliedArtworkAspectRatio = aspectRatio
        updateAppliedArtworkLayout()
      }).catch(() => {
        if (requestId !== artworkLayoutRequestId) return
        clearAppliedArtworkLayout()
      })
    } else if (hasTransformChanged) {
      updateAppliedArtworkLayout()
    }
  } else {
    appliedArtwork = null
    appliedArtworkAspectRatio = null
    artworkLayoutRequestId += 1
    removeArtworkResizeListener()
    clearAppliedArtworkLayout()
    document.documentElement.style.removeProperty("--app-background-artwork")
  }
}

function ensureArtworkResizeListener(): void {
  if (isArtworkResizeListenerActive) return
  window.addEventListener("resize", updateAppliedArtworkLayout)
  isArtworkResizeListenerActive = true
}

function removeArtworkResizeListener(): void {
  if (!isArtworkResizeListenerActive) return
  window.removeEventListener("resize", updateAppliedArtworkLayout)
  isArtworkResizeListenerActive = false
}

function updateAppliedArtworkLayout(): void {
  if (appliedArtworkAspectRatio === null) return

  const layout = resolveBackgroundArtworkLayout(
    window.innerWidth,
    window.innerHeight,
    appliedArtworkAspectRatio,
  )
  const center = resolveBackgroundArtworkCenter(
    layout,
    window.innerHeight,
    appliedArtworkTransform,
  )
  const translation = resolveBackgroundArtworkTranslation(
    layout,
    window.innerWidth,
    window.innerHeight,
    center.x,
    center.y,
  )
  const style = document.documentElement.style
  style.setProperty("--app-background-artwork-top", `${layout.top}px`)
  style.setProperty("--app-background-artwork-right", "auto")
  style.setProperty("--app-background-artwork-bottom", "auto")
  style.setProperty("--app-background-artwork-left", `${layout.left}px`)
  style.setProperty("--app-background-artwork-width", `${layout.width}px`)
  style.setProperty("--app-background-artwork-height", `${layout.height}px`)
  style.setProperty("--app-background-artwork-mask-size", "100% 100%")
  style.setProperty(
    "--app-background-artwork-x",
    `${translation.x}px`,
  )
  style.setProperty(
    "--app-background-artwork-y",
    `${translation.y}px`,
  )
}

function clearAppliedArtworkLayout(): void {
  const style = document.documentElement.style
  style.removeProperty("--app-background-artwork-top")
  style.removeProperty("--app-background-artwork-right")
  style.removeProperty("--app-background-artwork-bottom")
  style.removeProperty("--app-background-artwork-left")
  style.removeProperty("--app-background-artwork-width")
  style.removeProperty("--app-background-artwork-height")
  style.removeProperty("--app-background-artwork-mask-size")
  style.removeProperty("--app-background-artwork-x")
  style.removeProperty("--app-background-artwork-y")
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
