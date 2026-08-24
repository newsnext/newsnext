import type { RuntimeSource } from "@newsnext/source-kit/types"
import { normalizeSourceParams } from "@newsnext/source-kit/runtime"
import { hashKey } from "@tanstack/react-query"

export const SOURCE_QUERY_KEY = ["source"] as const

export interface SourceQueryTarget {
  instanceId?: string
  params: Record<string, unknown>
  remote?: boolean
  sourceId: string
  version: number
}

export function createSourceQueryTarget(
  sourceId: string,
  source: Pick<RuntimeSource, "params" | "version">,
  params: Record<string, unknown> = {},
  instanceId?: string,
  remote = false,
): SourceQueryTarget {
  return {
    ...(instanceId === undefined ? {} : { instanceId }),
    params: normalizeSourceParams(source, params),
    ...(remote ? { remote: true } : {}),
    sourceId,
    version: source.version,
  }
}

export function getSourceQueryKey(
  target: SourceQueryTarget,
): readonly ["source", string, number, Record<string, unknown>, string | null] {
  return [...SOURCE_QUERY_KEY, target.sourceId, target.version, target.params, target.instanceId ?? null]
}

export function getSourceQueryHash(target: SourceQueryTarget): string {
  return hashKey(getSourceQueryKey(target))
}
