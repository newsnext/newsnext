import type { SourceHistoryCommandRequest } from "@newsnext/extension-connection"
import {
  compareSourceHistoryObservations,
  getSourceHistoryObservation,
  listSourceHistoryObservations,
} from "../source/history/repository"
import { resolveInstanceHistoryTarget } from "./instance-history-data"
import { listConnectedInstances } from "./instance-list"

type InstanceHistoryRequest = Exclude<
  SourceHistoryCommandRequest,
  { type: "source-history.datasets" }
>

export async function executeInstanceHistoryRequest(
  request: InstanceHistoryRequest,
): Promise<unknown> {
  const target = resolveInstanceHistoryTarget(
    await listConnectedInstances(),
    request.instanceId,
  )
  switch (request.type) {
    case "source-history.observations": {
      const { cursor, from, limit, to } = request
      return await listSourceHistoryObservations({
        cursor,
        from,
        limit,
        to,
        ...target,
      })
    }
    case "source-history.get":
      return await getSourceHistoryObservation({
        observedAt: request.observedAt,
        ...target,
      })
    case "source-history.compare":
      return await compareSourceHistoryObservations({
        after: request.after,
        before: request.before,
        ...target,
      })
  }
}
