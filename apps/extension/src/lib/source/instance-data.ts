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
  listSourceHistoryObservations,
} from "./history/repository"

export type { InstanceDataTarget } from "./instance-data-target"
export { createInstanceDataTarget, resolveInstanceDataTarget } from "./instance-data-target"

export function listInstanceHistory(
  target: InstanceDataTarget,
  input: Omit<ListSourceHistoryObservationsInput, "params" | "sourceId">,
): Promise<SourceHistoryObservationPage> {
  return listSourceHistoryObservations({
    ...input,
    params: target.params,
    sourceId: target.sourceId,
  })
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
