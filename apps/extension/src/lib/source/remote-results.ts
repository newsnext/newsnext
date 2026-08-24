import type { QueryClient } from "@tanstack/react-query"
import type { Node } from "../node"
import type { Instance } from "./live-cards"
import { actions } from "../actions"
import { getSourceQueryKey } from "./query-target"

export interface RemoteInstance {
  instance: Instance
  nodeId: string
}

export function selectRemoteInstances(
  boardInstanceIds: readonly string[],
  localInstances: readonly Instance[],
  nodes: readonly Node[],
): RemoteInstance[] {
  const boardInstanceIdSet = new Set(boardInstanceIds)
  const knownInstanceIds = new Set(
    localInstances.map(instance => instance.instanceId),
  )
  const remoteInstances: RemoteInstance[] = []

  for (const node of nodes) {
    for (const instance of node.instances) {
      if (!boardInstanceIdSet.has(instance.instanceId) || knownInstanceIds.has(instance.instanceId)) continue
      knownInstanceIds.add(instance.instanceId)
      remoteInstances.push({ instance, nodeId: node.id })
    }
  }

  return remoteInstances
}

export async function restoreRemoteSourceResults(
  queryClient: QueryClient,
  remoteInstances: readonly RemoteInstance[],
): Promise<void> {
  await Promise.allSettled(remoteInstances.map(async ({ instance, nodeId }) => {
    const response = await actions.sourceConnection.readInstanceCache({
      instanceId: instance.instanceId,
    })
    if (!response) return
    if (response.result.source.id !== instance.sourceId) {
      throw new Error(`Remote Instance '${instance.instanceId}' returned the wrong Source`)
    }

    queryClient.setQueryData(
      getSourceQueryKey({
        instanceId: instance.instanceId,
        nodeId,
        params: response.params,
        remote: true,
        sourceId: instance.sourceId,
        version: response.result.source.version,
      }),
      response,
      { updatedAt: response.fetchedAt },
    )
  }))
}
