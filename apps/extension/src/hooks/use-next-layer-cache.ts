import type { SourceItemTemplate } from "@newsnext/source/types"
import type {
  NextLayerCacheResults,
  NextLayerCacheTarget,
  NextLayerInstanceSelection,
} from "@/lib/board/next-layer-data"
import type { CardViewModel, NewsItem } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import {
  observeNextLayerCache,
  selectNextLayerInstanceIds,
} from "@/lib/board/next-layer-data"
import {
  applySourceLoaderMetadata,
  createBoardSource,
  createInstanceDataTarget,
} from "@/lib/source"
import { instancesAtom } from "@/store/board"
import { useBoardSourceCards } from "./use-board-source-cards"
import { useSourceDescriptors } from "./use-source-descriptors"

export interface NextLayerInstanceCache {
  card: CardViewModel
  items: NewsItem[]
  itemTemplate?: SourceItemTemplate
  updatedAt: number
}

interface NextLayerCacheEntry {
  card: CardViewModel
  target: NextLayerCacheTarget
}

interface CacheResultsState {
  results: NextLayerCacheResults
  targets: readonly NextLayerCacheTarget[] | undefined
}

const EMPTY_CACHE_RESULTS: NextLayerCacheResults = {}

export function useNextLayerCache({
  boardId,
  enabled,
  selection,
}: {
  boardId: string
  enabled: boolean
  selection: NextLayerInstanceSelection
}): {
  instanceIds: string[]
  isLoading: boolean
  results: Record<string, NextLayerInstanceCache>
} {
  const instances = useAtomValue(instancesAtom)
  const { instanceIds: boardInstanceIds } = useBoardSourceCards(boardId)
  const { isLoading: areSourcesLoading, sources } = useSourceDescriptors()
  const instanceIds = useMemo(
    () => selectNextLayerInstanceIds(boardInstanceIds, selection),
    [boardInstanceIds, selection],
  )
  const entries = useMemo(() => {
    const instancesById = new Map(instances.map(instance => [instance.instanceId, instance]))
    const sourcesById = new Map(sources.map(source => [source.id, source]))

    return instanceIds.flatMap((instanceId): NextLayerCacheEntry[] => {
      const instance = instancesById.get(instanceId)
      if (!instance) return []
      const source = sourcesById.get(instance.sourceId)
      if (!source) return []
      const target = createInstanceDataTarget(instance, source)

      return [{
        card: createBoardSource(source, instance, boardId),
        target: {
          ...target,
          cacheVersion: source.cache.version,
        },
      }]
    })
  }, [boardId, instanceIds, instances, sources])
  const targets = useMemo(() => entries.map(entry => entry.target), [entries])
  const [cacheResultsState, setCacheResultsState] = useState<CacheResultsState>({
    results: {},
    targets: undefined,
  })

  useEffect(() => {
    if (!enabled || areSourcesLoading) return

    return observeNextLayerCache(targets, results => setCacheResultsState({
      results,
      targets,
    }))
  }, [areSourcesLoading, enabled, targets])

  const rawResults = cacheResultsState.targets === targets
    ? cacheResultsState.results
    : EMPTY_CACHE_RESULTS
  const results = useMemo(() => {
    const availableResults: Record<string, NextLayerInstanceCache> = {}
    for (const entry of entries) {
      const current = rawResults[entry.target.instanceId]
      if (!current) continue

      availableResults[entry.target.instanceId] = {
        card: applySourceLoaderMetadata(entry.card, current.metadata),
        items: current.items,
        itemTemplate: current.itemTemplate,
        updatedAt: current.updatedAt,
      }
    }
    return availableResults
  }, [entries, rawResults])

  return {
    instanceIds,
    isLoading: enabled && (
      areSourcesLoading || cacheResultsState.targets !== targets
    ),
    results,
  }
}
