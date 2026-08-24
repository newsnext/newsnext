import type { QueryClient } from "@tanstack/react-query"
import type { Instance } from "./live-cards"
import { actions } from "../actions"
import { createInstanceQueryTarget, getSourceQueryKey } from "./query-target"

export async function restoreInstanceResults(
  queryClient: QueryClient,
  instances: readonly Pick<Instance, "instanceId" | "sourceId">[],
): Promise<void> {
  await Promise.allSettled(instances.map(async (instance) => {
    const response = await actions.sourceConnection.readInstanceCache({
      instanceId: instance.instanceId,
    })
    if (!response) return
    if (response.result.source.id !== instance.sourceId) {
      throw new Error(`Instance '${instance.instanceId}' returned the wrong Source`)
    }
    queryClient.setQueryData(
      getSourceQueryKey(createInstanceQueryTarget(instance.instanceId)),
      response,
      { updatedAt: response.fetchedAt },
    )
  }))
}
