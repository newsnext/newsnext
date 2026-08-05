export interface ProcessBgIllustrationRequest {
  file?: File
  requestId: number
  sourceId: number
  threshold: number
  type: "process"
}

export interface ReleaseBgIllustrationSourceRequest {
  sourceId: number
  type: "release-source"
}

export type BgIllustrationWorkerRequest
  = | ProcessBgIllustrationRequest
    | ReleaseBgIllustrationSourceRequest

export type BgIllustrationWorkerResponse = {
  illustration: string
  requestId: number
} | {
  error: string
  requestId: number
}
