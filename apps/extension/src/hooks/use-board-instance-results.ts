import type { SourceItemTemplate } from "@newsnext/source/types"
import type { BoardFilter } from "@/lib/board"
import type { CardViewModel, NewsItem } from "@/typings/source"
import { useQueries, useQueryClient } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { filterBoardItems } from "@/lib/board"
import {
  applySourceLoaderMetadata,
  createBoardSource,
  createInstanceDataTarget,
} from "@/lib/source"
import { instancesAtom } from "@/store/board"
import { getSourceQueryHash, getSourceQueryOptions, hydrateSourceQueryCache } from "./source-query"
import { useSourceDescriptors } from "./use-source-descriptors"

export interface BoardInstanceResult {
  card: CardViewModel
  items: NewsItem[]
  itemTemplate?: SourceItemTemplate
  updatedAt: number
}

interface UseBoardInstanceResultsOptions {
  boardId: string
  enabled: boolean
  filter?: BoardFilter
  instanceIds: string[]
}

export function useBoardInstanceResults({
  boardId,
  enabled,
  filter,
  instanceIds,
}: UseBoardInstanceResultsOptions): {
  isHydrating: boolean
  results: Record<string, BoardInstanceResult>
} {
  const queryClient = useQueryClient()
  const instances = useAtomValue(instancesAtom)
  const { isLoading: areSourcesLoading, sources } = useSourceDescriptors()
  const entries = useMemo(() => {
    if (!enabled) return []

    const instancesById = new Map(instances.map(instance => [instance.instanceId, instance]))
    const sourcesById = new Map(sources.map(source => [source.id, source]))

    return instanceIds.flatMap((instanceId) => {
      const instance = instancesById.get(instanceId)
      if (!instance) return []
      const source = sourcesById.get(instance.sourceId)
      if (!source) return []

      return [{
        card: createBoardSource(source, instance, boardId),
        target: createInstanceDataTarget(instance, source),
      }]
    })
  }, [boardId, enabled, instanceIds, instances, sources])
  const targets = useMemo(() => entries.map(entry => entry.target), [entries])
  const targetKey = useMemo(
    () => targets.map(getSourceQueryHash).join("\0"),
    [targets],
  )
  const [hydratedTargetKey, setHydratedTargetKey] = useState("")
  const sourceQueryOptions = useMemo(
    () => targets.map(target => ({
      ...getSourceQueryOptions(queryClient, target),
      enabled: false,
    })),
    [queryClient, targets],
  )
  const currentResults = useQueries({
    queries: sourceQueryOptions,
    combine: results => results.map(result => result.data),
  })

  useEffect(() => {
    let isActive = true

    void Promise.all(targets.map(target => (
      hydrateSourceQueryCache(queryClient, target)
    ))).finally(() => {
      if (isActive) setHydratedTargetKey(targetKey)
    })

    return () => {
      isActive = false
    }
  }, [queryClient, targetKey, targets])

  const results = useMemo(() => {
    const availableResults: Record<string, BoardInstanceResult> = {}
    entries.forEach((entry, index) => {
      const current = currentResults[index]
      if (!current) return

      availableResults[entry.target.instanceId] = {
        card: applySourceLoaderMetadata(entry.card, current.metadata),
        items: filterBoardItems(current.items, filter),
        itemTemplate: current.itemTemplate,
        updatedAt: current.updatedAt,
      }
    })
    return availableResults
  }, [currentResults, entries, filter])

  return {
    isHydrating: enabled && (
      areSourcesLoading || (targets.length > 0 && hydratedTargetKey !== targetKey)
    ),
    results,
  }
}
