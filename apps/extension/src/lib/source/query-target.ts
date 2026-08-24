import type { RuntimeSource } from "@newsnext/source-kit/types"
import { normalizeSourceParams } from "@newsnext/source-kit/runtime"
import { hashKey } from "@tanstack/react-query"

export const SOURCE_QUERY_KEY = ["source"] as const

export interface RemoteSourceQueryTarget {
  instanceId: string
  nodeId: string
}

interface SourceQueryTargetBase {
  params: Record<string, unknown>
  sourceId: string
  version: number
}

export type SourceQueryTarget = SourceQueryTargetBase & (
  | { instanceId: string, nodeId: string, remote: true }
  | { instanceId?: never, nodeId?: never, remote?: false }
)

export function createSourceQueryTarget(
  sourceId: string,
  source: Pick<RuntimeSource, "params" | "version">,
  params: Record<string, unknown> = {},
  remote?: RemoteSourceQueryTarget,
): SourceQueryTarget {
  const target: SourceQueryTarget = {
    params: normalizeSourceParams(source, params),
    sourceId,
    version: source.version,
  }
  if (remote === undefined) {
    return target
  }
  return { ...target, ...remote, remote: true }
}

export function getSourceQueryKey(
  target: SourceQueryTarget,
): readonly ["source", string, number, Record<string, unknown>, string | null] {
  return [
    ...SOURCE_QUERY_KEY,
    target.sourceId,
    target.version,
    target.params,
    target.remote ? target.nodeId : null,
  ]
}

export function getSourceQueryHash(target: SourceQueryTarget): string {
  return hashKey(getSourceQueryKey(target))
}
