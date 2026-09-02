import type { UseQueryResult } from "@tanstack/react-query"
import type { AppIntegrationStatus } from "@/lib/background/app-integration-native"
import { useQuery } from "@tanstack/react-query"
import { actions } from "@/lib/actions"

export const APP_INTEGRATION_STATUS_QUERY_KEY = ["app-integration-status"] as const

export function useAppIntegrationStatus(enabled = true): UseQueryResult<AppIntegrationStatus> {
  return useQuery({
    queryKey: APP_INTEGRATION_STATUS_QUERY_KEY,
    queryFn: () => actions.appIntegration.getStatus(),
    enabled,
    refetchInterval: 2_000,
  })
}
