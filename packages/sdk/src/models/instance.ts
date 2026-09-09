import type { SourcePatch, SourcePresentationMetadata } from "./source.js"

export interface Instance {
  instanceId: string
  workerId: string
  sourceId: string
  patch: InstancePatch
  createdAt: number
}

export type InstanceMetadata = SourcePresentationMetadata

export type InstancePatch = SourcePatch<
  Record<string, unknown>,
  InstanceMetadata
>
