import type { LiveWidgetDataResult } from "@newsnext/sdk/extension"
import { createClient } from "@newsnext/sdk/extension"
import { useQuery } from "@tanstack/react-query"

const client = createClient()
const LIVE_WIDGET_QUERY_KEY = ["live-widget"] as const

interface WidgetDataInput {
  boardId: string
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

export function useLiveWidgetData(input: WidgetDataInput, active: boolean): WidgetDataView {
  const cardIds = [...input.cardIds].sort()
  const query = useQuery({
    // Request identity is widget + scope + data fingerprint + params only; view configuration must not enter it. A key change aborts the obsolete request and drops its late result.
    queryKey: [
      ...LIVE_WIDGET_QUERY_KEY,
      input.boardId,
      input.widgetId,
      cardIds,
      input.dataRevision,
      input.params,
    ],
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
