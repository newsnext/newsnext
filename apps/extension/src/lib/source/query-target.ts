import type { RuntimeSource } from "@newsnext/source-kit/types"
import { normalizeSourceParams } from "@newsnext/source-kit/runtime"
import { hashKey } from "@tanstack/react-query"

export const SOURCE_QUERY_KEY = ["source"] as const
export const INSTANCE_QUERY_KEY = ["instance"] as const

export interface InstanceQueryTarget {
  instanceId: string
}

export interface DraftSourceQueryTarget {
  params: Record<string, unknown>
  sourceId: string
  version: number
}

export type SourceQueryTarget = InstanceQueryTarget | DraftSourceQueryTarget

export function createInstanceQueryTarget(
  instanceId: string,
): InstanceQueryTarget {
  return { instanceId }
}

export function createSourceQueryTarget(
  sourceId: string,
  source: Pick<RuntimeSource, "params" | "version">,
  params: Record<string, unknown> = {},
): DraftSourceQueryTarget {
  return {
    params: normalizeSourceParams(source, params),
    sourceId,
    version: source.version,
  }
}

export function getSourceQueryKey(
  target: SourceQueryTarget,
): readonly ["instance", string]
  | readonly ["source", string, number, Record<string, unknown>] {
  if ("instanceId" in target) {
    return [...INSTANCE_QUERY_KEY, target.instanceId]
  }
  return [
    ...SOURCE_QUERY_KEY,
    target.sourceId,
    target.version,
    target.params,
  ]
}

export function getSourceQueryHash(target: SourceQueryTarget): string {
  return hashKey(getSourceQueryKey(target))
}
