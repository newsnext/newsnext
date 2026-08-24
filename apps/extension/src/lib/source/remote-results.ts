import type { QueryClient } from "@tanstack/react-query"
import type { Instance } from "./live-cards"
import { browser } from "#imports"
import { actions } from "../actions"
import { NODES_STORAGE_KEY, normalizeNodes } from "../node"
import {
  normalizeApplicationData,
  PERSISTED_DATA_SLICES,
} from "../settings"
import { getSourceQueryKey } from "./query-target"

function selectRemoteInstances(
  localInstances: readonly Instance[],
  nodes: ReturnType<typeof normalizeNodes>,
): Instance[] {
  const knownInstanceIds = new Set(
    localInstances.map(instance => instance.instanceId),
  )
  const remoteInstances: Instance[] = []

  for (const instance of nodes.flatMap(node => node.instances)) {
    if (knownInstanceIds.has(instance.instanceId)) continue
    knownInstanceIds.add(instance.instanceId)
    remoteInstances.push(instance)
  }

  return remoteInstances
}

export async function restoreRemoteSourceResults(
  queryClient: QueryClient,
): Promise<void> {
  try {
    const stored = await browser.storage.local.get([
      PERSISTED_DATA_SLICES.application.key,
      NODES_STORAGE_KEY,
    ])
    const application = normalizeApplicationData(
      stored[PERSISTED_DATA_SLICES.application.key],
    )
    const nodes = normalizeNodes(stored[NODES_STORAGE_KEY])
    const remoteInstances = selectRemoteInstances(application.instances, nodes)

    await Promise.allSettled(remoteInstances.map(async (instance) => {
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
          params: response.params,
          remote: true,
          sourceId: instance.sourceId,
          version: response.result.source.version,
        }),
        response,
        { updatedAt: response.fetchedAt },
      )
    }))
  } catch (error) {
    console.error("Failed to restore remote Source results", error)
  }
}
