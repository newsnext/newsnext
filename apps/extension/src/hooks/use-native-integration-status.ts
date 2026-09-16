import type { UseQueryResult } from "@tanstack/react-query"
import type { NativeIntegrationStatus } from "@/lib/background/native-integration"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { browser } from "#imports"
import { actions } from "@/lib/actions"
import { isBackgroundNativeStatusChangedMessage } from "@/lib/background/native-status-events"

export const NATIVE_INTEGRATION_STATUS_QUERY_KEY = ["native-integration-status"] as const

export function useNativeIntegrationStatus(enabled = true): UseQueryResult<NativeIntegrationStatus> {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    const handleMessage = (message: unknown): void => {
      if (isBackgroundNativeStatusChangedMessage(message)) {
        void queryClient.invalidateQueries({ queryKey: NATIVE_INTEGRATION_STATUS_QUERY_KEY })
      }
    }
    browser.runtime.onMessage.addListener(handleMessage)
    return () => browser.runtime.onMessage.removeListener(handleMessage)
  }, [enabled, queryClient])
  return useQuery({
    queryKey: NATIVE_INTEGRATION_STATUS_QUERY_KEY,
    queryFn: () => actions.nativeIntegration.getStatus(),
    enabled,
    refetchInterval: 2_000,
  })
}
