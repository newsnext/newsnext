import type { SourceHistoryCommandRequest } from "@newsnext/extension-connection"
import {
  compareInstanceHistoryObservations,
  getInstanceHistoryObservation,
  listInstanceHistory,
  loadSourceDescriptors,
  resolveInstanceDataTarget,
} from "../source"
import { listConnectedInstances } from "./instance-list"

type InstanceHistoryRequest = Exclude<
  SourceHistoryCommandRequest,
  { type: "source-history.datasets" }
>

export async function executeInstanceHistoryRequest(
  request: InstanceHistoryRequest,
): Promise<unknown> {
  const [instances, sources] = await Promise.all([
    listConnectedInstances(),
    loadSourceDescriptors(),
  ])
  const target = resolveInstanceDataTarget(instances, sources, request.instanceId)
  switch (request.type) {
    case "source-history.observations": {
      const { cursor, from, limit, to } = request
      return listInstanceHistory(target, {
        cursor,
        from,
        limit,
        to,
      })
    }
    case "source-history.get":
      return getInstanceHistoryObservation(target, {
        observedAt: request.observedAt,
      })
    case "source-history.compare":
      return compareInstanceHistoryObservations(target, {
        after: request.after,
        before: request.before,
      })
  }
}
