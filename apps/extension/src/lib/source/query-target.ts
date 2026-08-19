import type { RuntimeSource } from "@newsnext/source-kit/types"
import { normalizeSourceParams } from "@newsnext/source-kit/runtime"
import { hashKey } from "@tanstack/react-query"

export const SOURCE_QUERY_KEY = ["source"] as const

export interface SourceQueryTarget {
  params: Record<string, unknown>
  sourceId: string
  version: number
}

export function createSourceQueryTarget(
  sourceId: string,
  source: Pick<RuntimeSource, "params" | "version">,
  params: Record<string, unknown> = {},
): SourceQueryTarget {
  return {
    params: normalizeSourceParams(source, params),
    sourceId,
    version: source.version,
  }
}

export function getSourceQueryKey(
  target: SourceQueryTarget,
): readonly ["source", string, number, Record<string, unknown>] {
  return [...SOURCE_QUERY_KEY, target.sourceId, target.version, target.params]
}

export function getSourceQueryHash(target: SourceQueryTarget): string {
  return hashKey(getSourceQueryKey(target))
}
