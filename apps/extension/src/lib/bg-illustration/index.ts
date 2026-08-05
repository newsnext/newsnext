import type {
  BgIllustrationWorkerRequest,
  BgIllustrationWorkerResponse,
} from "./worker-protocol"
import { browser } from "#imports"

export {
  areBgIllustrationTransformsEqual,
  DEFAULT_BG_ILLUSTRATION_OPACITY,
  DEFAULT_BG_ILLUSTRATION_TRANSFORM,
  MAX_BG_ILLUSTRATION_FILE_SIZE,
  MAX_BG_ILLUSTRATION_OPACITY,
  MAX_BG_ILLUSTRATION_SCALE,
  MIN_BG_ILLUSTRATION_OPACITY,
  MIN_BG_ILLUSTRATION_SCALE,
  normalizeBgIllustrationOpacity,
  normalizeBgIllustrationTransform,
} from "./config"
export type { BgIllustrationTransform } from "./config"
export {
  createBgIllustrationFromSvg,
  isSvgIllustrationFile,
} from "./file"
export {
  loadBgIllustrationAspectRatio,
  resolveBgIllustrationCenter,
  resolveBgIllustrationLayout,
  resolveBgIllustrationTranslation,
} from "./layout"
export {
  DEFAULT_LINE_ART_THRESHOLD,
} from "./processing"

interface PendingWorkerRequest {
  reject: (reason: Error) => void
  resolve: (illustration: string) => void
}

let illustrationWorker: Worker | undefined
let activeSourceFile: File | undefined
let activeSourceId = 0
let nextRequestId = 0
const pendingWorkerRequests = new Map<number, PendingWorkerRequest>()

export function createBgIllustrationFromImage(
  file: File,
  threshold: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = getIllustrationWorker()
    } catch (error: unknown) {
      reject(error instanceof Error ? error : new Error("Background illustration processing is unavailable."))
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
    const request: BgIllustrationWorkerRequest = {
      type: "process",
      requestId,
      sourceId: activeSourceId,
      threshold,
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

export function releaseBgIllustrationSource(file: File): void {
  if (!illustrationWorker || activeSourceFile !== file) return

  try {
    illustrationWorker.postMessage({
      type: "release-source",
      sourceId: activeSourceId,
    } satisfies BgIllustrationWorkerRequest)
  } catch {
    handleWorkerError()
  }
  activeSourceFile = undefined
}

function getIllustrationWorker(): Worker {
  if (illustrationWorker) return illustrationWorker

  illustrationWorker = new Worker(browser.runtime.getURL("/bg-illustration-worker.js"))
  illustrationWorker.addEventListener("message", handleWorkerMessage)
  illustrationWorker.addEventListener("error", handleWorkerError)
  illustrationWorker.addEventListener("messageerror", handleWorkerError)
  return illustrationWorker
}

function handleWorkerMessage(event: MessageEvent<BgIllustrationWorkerResponse>): void {
  const pending = pendingWorkerRequests.get(event.data.requestId)
  if (!pending) return

  pendingWorkerRequests.delete(event.data.requestId)
  if ("error" in event.data) {
    pending.reject(new Error(event.data.error))
    return
  }

  pending.resolve(event.data.illustration)
}

function handleWorkerError(): void {
  const error = new Error("Background illustration processing stopped unexpectedly.")
  for (const pending of pendingWorkerRequests.values()) pending.reject(error)
  pendingWorkerRequests.clear()
  illustrationWorker?.terminate()
  illustrationWorker = undefined
  activeSourceFile = undefined
}
