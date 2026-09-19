import type { LiveWidgetDataResult } from "@newsnext/sdk/extension"
import { createClient } from "@newsnext/sdk/extension"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import {
  getWidgetManualRequestGroup,
  LIVE_WIDGET_QUERY_KEY,
  runManualRequest,
  useIsManualRequestingGroup,
} from "@/hooks/use-manual-request"

const client = createClient()

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
  isFetching: boolean
  isContentFetching: boolean
  refetch: () => Promise<unknown>
}

export function useLiveWidgetData(input: WidgetDataInput, active: boolean): WidgetDataView {
  const cardIds = [...input.cardIds].sort()
  const query = useQuery({
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
    placeholderData: previous => previous,
    refetchInterval: input.refreshIntervalMs,
    refetchIntervalInBackground: false,
    retry: false,
  })
  const { refetch: queryRefetch } = query
  const [isManualRequesting, setIsManualRequesting] = useState(false)
  const isBoardManuallyRequesting = useIsManualRequestingGroup(getWidgetManualRequestGroup(input.boardId))
  const refetch = useCallback(async () => {
    setIsManualRequesting(true)
    try {
      await runManualRequest(queryRefetch)
    } finally {
      setIsManualRequesting(false)
    }
  }, [queryRefetch])

  return {
    data: query.data,
    error: query.error instanceof Error ? query.error : undefined,
    isFetching: active && (query.isFetching || isManualRequesting || isBoardManuallyRequesting),
    isContentFetching: active && !query.data && (isManualRequesting || isBoardManuallyRequesting || query.isFetching),
    refetch,
  }
}
