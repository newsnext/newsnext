import type {
  CompareSourceHistoryObservationsInput,
  GetSourceHistoryObservationInput,
  ListSourceHistoryObservationsInput,
  SourceHistoryObservationDiffResult,
  SourceHistoryObservationPage,
  SourceHistoryObservationResult,
} from "./history/repository"
import type { InstanceDataTarget } from "./instance-data-target"
import {
  compareSourceHistoryObservations,
  getSourceHistoryObservation,
  listSourceHistoryObservationsByIdentity,
} from "./history/repository"
import { buildSourceHistoryDatasetKey } from "./history/values"

export type ListInstanceHistoryInput = Omit<
  ListSourceHistoryObservationsInput,
  "params" | "sourceId"
>
export type { SourceHistoryObservationPage } from "./history/repository"

export type { InstanceDataTarget } from "./instance-data-target"
export { createInstanceDataTarget, resolveInstanceDataTarget } from "./instance-data-target"

export function listInstanceHistory(
  target: InstanceDataTarget,
  input: ListInstanceHistoryInput,
): Promise<SourceHistoryObservationPage> {
  return listSourceHistoryObservationsByIdentity(
    buildSourceHistoryDatasetKey(target.sourceId, target.params),
    input,
  )
}

export function getInstanceHistoryObservation(
  target: InstanceDataTarget,
  input: Omit<GetSourceHistoryObservationInput, "params" | "sourceId">,
): Promise<SourceHistoryObservationResult> {
  return getSourceHistoryObservation({
    ...input,
    params: target.params,
    sourceId: target.sourceId,
  })
}

export function compareInstanceHistoryObservations(
  target: InstanceDataTarget,
  input: Omit<CompareSourceHistoryObservationsInput, "params" | "sourceId">,
): Promise<SourceHistoryObservationDiffResult> {
  return compareSourceHistoryObservations({
    ...input,
    params: target.params,
    sourceId: target.sourceId,
  })
}
