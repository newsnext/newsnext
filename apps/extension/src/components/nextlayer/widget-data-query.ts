import { createClient } from "@newsnext/sdk/extension"
import { queryOptions } from "@tanstack/react-query"

const client = createClient()

interface WidgetDataQueryInput {
  widgetId: string
  instanceIds: string[]
  dataRevision: string
  refreshIntervalMs: number
  staleTimeMs: number
}

export function widgetDataQueryOptions(input: WidgetDataQueryInput) {
  const instanceIds = [...input.instanceIds].sort()
  return queryOptions({
    queryKey: ["widgets", "data", input.widgetId, instanceIds, input.dataRevision],
    queryFn: ({ signal }) => client.widgets.data({ widgetId: input.widgetId, instanceIds }, { signal }),
    staleTime: input.staleTimeMs,
    refetchInterval: input.refreshIntervalMs,
    refetchIntervalInBackground: false,
    retry: false,
  })
}
