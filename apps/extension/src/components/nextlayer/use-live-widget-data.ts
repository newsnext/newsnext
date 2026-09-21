import type { LiveWidgetDataResult } from "@newsnext/sdk/extension"
import type { QueryClient } from "@tanstack/react-query"
import { createClient } from "@newsnext/sdk/extension"
import { useQuery } from "@tanstack/react-query"

const client = createClient()
export const LIVE_WIDGET_QUERY_KEY = ["live-widget"] as const

interface WidgetDataInput {
  params: Record<string, unknown>
  widgetId: string
  cardIds: string[]
  dataRevision: string
  refreshIntervalMs: number
}

interface WidgetDataView {
  data?: LiveWidgetDataResult
  error?: Error
  isContentFetching: boolean
  refetch: () => Promise<unknown>
}

export interface WidgetDataQueryKey {
  cardIds: string[]
  dataRevision: string
  params: Record<string, unknown>
  widgetId: string
}

// Request identity is widget + scope + data fingerprint + params only: the
// daemon ignores boards (its snapshot store keys board_id as ""), and cards
// belong to exactly one board, so boardId would only partition the cache
// without changing the data. View configuration must not enter it. A key
// change aborts the obsolete request and drops its late result.
export function buildWidgetDataQueryKey(input: WidgetDataQueryKey): readonly unknown[] {
  return [
    ...LIVE_WIDGET_QUERY_KEY,
    input.widgetId,
    input.cardIds,
    input.dataRevision,
    input.params,
  ]
}

function parseWidgetDataQueryKey(key: readonly unknown[]): WidgetDataQueryKey | undefined {
  const [, widgetId, cardIds, dataRevision, params] = key
  if (typeof widgetId !== "string"
    || !Array.isArray(cardIds)
    || !cardIds.every(cardId => typeof cardId === "string")
    || typeof dataRevision !== "string"
    || !isRecord(params)) {
    return undefined
  }
  return { cardIds, dataRevision, params, widgetId }
}

export function useLiveWidgetData(input: WidgetDataInput, active: boolean): WidgetDataView {
  const cardIds = [...input.cardIds].sort()
  const query = useQuery({
    queryKey: buildWidgetDataQueryKey({ ...input, cardIds }),
    queryFn: ({ signal }) => client.liveWidgets.data(
      { widgetId: input.widgetId, cardIds, params: input.params },
      { signal },
    ),
    enabled: active,
    networkMode: "offlineFirst",
    // A failed background refresh keeps the last successful data on screen.
    placeholderData: previous => previous,
    refetchInterval: input.refreshIntervalMs,
    refetchIntervalInBackground: false,
    retry: false,
  })
  return {
    data: query.data,
    error: query.error instanceof Error ? query.error : undefined,
    isContentFetching: active && !query.data && query.isFetching,
    refetch: query.refetch,
  }
}

/**
 * Last successful data for a removed Widget definition, matched by exact
 * `dataRevision` (the definition version): foreign-version data never renders.
 * One-shot read; without a manifest no new fetches can update it.
 */
export function findLastWidgetData(
  queryClient: QueryClient,
  widgetId: string,
  dataRevision: string,
): Record<string, unknown> | undefined {
  const prefix = [...LIVE_WIDGET_QUERY_KEY, widgetId]
  let latest: { queries: Record<string, unknown>, updatedAt: number } | undefined
  for (const query of queryClient.getQueryCache().findAll({ queryKey: prefix, exact: false })) {
    const parsed = parseWidgetDataQueryKey(query.queryKey)
    if (!parsed || parsed.dataRevision !== dataRevision) continue
    const data = query.state.data
    if (!isWidgetDataResult(data)) continue
    const updatedAt = query.state.dataUpdatedAt
    if (!latest || updatedAt > latest.updatedAt) {
      latest = { queries: data.queries, updatedAt }
    }
  }
  return latest?.queries
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isWidgetDataResult(value: unknown): value is { queries: Record<string, unknown> } {
  return isRecord(value) && isRecord(value.queries)
}
