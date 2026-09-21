import type { LiveWidgetDataResult } from "@newsnext/sdk/extension"
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
