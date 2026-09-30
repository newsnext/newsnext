import type { InsightCatalogEntry } from "@newsnext/sdk/models"
import type { UseQueryResult } from "@tanstack/react-query"
import type { NativeIntegrationStatus } from "@/lib/background/native-integration"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useBackgroundEvent } from "@/hooks/use-background-event"
import { actions } from "@/lib/actions"

export const NATIVE_INTEGRATION_STATUS_QUERY_KEY = ["native-integration-status"] as const
export const INSIGHT_CATALOG_QUERY_KEY = ["insight-catalog"] as const

function useStatusChangedInvalidation(queryKey: readonly string[], enabled: boolean): void {
  const queryClient = useQueryClient()
  useBackgroundEvent("nativeIntegration.statusChanged", () => {
    void queryClient.invalidateQueries({ queryKey })
  }, enabled)
}

export function useNativeIntegrationStatus(enabled = true): UseQueryResult<NativeIntegrationStatus> {
  useStatusChangedInvalidation(NATIVE_INTEGRATION_STATUS_QUERY_KEY, enabled)
  return useQuery({
    queryKey: NATIVE_INTEGRATION_STATUS_QUERY_KEY,
    queryFn: () => actions.nativeIntegration.getStatus(),
    enabled,
    refetchInterval: 2_000,
  })
}

export function useInsightCatalog(enabled = true): UseQueryResult<InsightCatalogEntry[]> {
  useStatusChangedInvalidation(INSIGHT_CATALOG_QUERY_KEY, enabled)
  return useQuery({
    queryKey: INSIGHT_CATALOG_QUERY_KEY,
    queryFn: () => actions.nativeIntegration.getInsights(),
    enabled,
  })
}
