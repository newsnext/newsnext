import type {
  ListInstanceHistoryInput,
  SourceHistoryObservationPage,
} from "../source/instance-data"
import type { InstanceDataTarget } from "../source/instance-data-target"
import type { SourceLoadResult } from "../source/loader"
import { observeSourceCaches } from "../source/cache"
import { buildSourceCacheKey } from "../source/cache-values"
import { listInstanceHistory } from "../source/instance-data"

export type NextLayerInstanceSelection
  = | { scope: "board" }
    | { instanceIds: readonly string[], scope: "instances" }

export interface NextLayerCacheTarget extends InstanceDataTarget {
  cacheVersion: number
}

export type NextLayerCacheResults = Record<string, SourceLoadResult>
export type NextLayerHistoryResults = Record<string, SourceHistoryObservationPage>

export function selectNextLayerInstanceIds(
  boardInstanceIds: readonly string[],
  selection: NextLayerInstanceSelection,
): string[] {
  if (selection.scope === "board") return [...boardInstanceIds]

  const boardIds = new Set(boardInstanceIds)
  return [...new Set(selection.instanceIds)].filter(instanceId => boardIds.has(instanceId))
}

function mapNextLayerCacheResults(
  targets: readonly NextLayerCacheTarget[],
  cachedResults: readonly (SourceLoadResult | undefined)[],
): NextLayerCacheResults {
  return Object.fromEntries(targets.flatMap((target, index) => {
    const result = cachedResults[index]
    return result ? [[target.instanceId, result]] : []
  }))
}

export function observeNextLayerCache(
  targets: readonly NextLayerCacheTarget[],
  onResults: (results: NextLayerCacheResults) => void,
): () => void {
  const cacheKeys = targets.map(target => buildSourceCacheKey(
    target.sourceId,
    target.cacheVersion,
    target.params,
  ))

  return observeSourceCaches(cacheKeys, (cachedResults) => {
    onResults(mapNextLayerCacheResults(targets, cachedResults))
  })
}

export async function readNextLayerHistory(
  targets: readonly InstanceDataTarget[],
  input: ListInstanceHistoryInput = {},
): Promise<NextLayerHistoryResults> {
  const entries = await Promise.all(targets.map(async target => (
    [target.instanceId, await listInstanceHistory(target, input)] as const
  )))
  return Object.fromEntries(entries)
}
