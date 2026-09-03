import type { UseQueryResult } from "@tanstack/react-query"
import type { NativeIntegrationStatus } from "@/lib/background/native-integration"
import { useQuery } from "@tanstack/react-query"
import { actions } from "@/lib/actions"

export const NATIVE_INTEGRATION_STATUS_QUERY_KEY = ["native-integration-status"] as const

export function useNativeIntegrationStatus(enabled = true): UseQueryResult<NativeIntegrationStatus> {
  return useQuery({
    queryKey: NATIVE_INTEGRATION_STATUS_QUERY_KEY,
    queryFn: () => actions.nativeIntegration.getStatus(),
    enabled,
    refetchInterval: 2_000,
  })
}
