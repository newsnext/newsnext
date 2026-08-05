import type { BackgroundArtworkFormat } from "./background-artwork-processing"

export interface ProcessBackgroundArtworkRequest {
  file?: File
  format: BackgroundArtworkFormat
  requestId: number
  sourceId: number
  threshold: number
  type: "process"
}

export interface ReleaseBackgroundArtworkSourceRequest {
  sourceId: number
  type: "release-source"
}

export type BackgroundArtworkWorkerRequest
  = | ProcessBackgroundArtworkRequest
    | ReleaseBackgroundArtworkSourceRequest

export type BackgroundArtworkWorkerResponse = {
  artwork: string
  requestId: number
} | {
  error: string
  requestId: number
}
