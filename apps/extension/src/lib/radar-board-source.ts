import type { RadarSuggestion } from "@/lib/radar"
import type { SourceInstanceMeta } from "@/lib/source-cards"
import type { BoardSource, SourceDescriptor } from "@/typings/source"

export interface RadarDraftPatch {
  paramsPatch?: Record<string, unknown>
  metaPatch?: SourceInstanceMeta
}

export function mergeRadarDraftPatch(current: RadarDraftPatch | undefined, patch: RadarDraftPatch): RadarDraftPatch {
  const mergedPatch: RadarDraftPatch = {}

  if (current?.paramsPatch || patch.paramsPatch) {
    mergedPatch.paramsPatch = { ...current?.paramsPatch, ...patch.paramsPatch }
  }

  if (current?.metaPatch || patch.metaPatch) {
    mergedPatch.metaPatch = { ...current?.metaPatch, ...patch.metaPatch }
  }

  return mergedPatch
}

export function createRadarBoardSource(
  suggestion: RadarSuggestion,
  descriptors: SourceDescriptor[],
  draftPatch?: RadarDraftPatch,
): BoardSource | null {
  const descriptor = descriptors.find(source => source.id === suggestion.sourceId)
  if (!descriptor) {
    return null
  }

  const metaPatch = draftPatch?.metaPatch ?? {}
  const paramsPatch = {
    ...suggestion.paramsPatch,
    ...draftPatch?.paramsPatch,
  }

  return {
    ...descriptor,
    ...suggestion.metaPatch,
    ...metaPatch,
    id: `tmp:radar:${suggestion.id}`,
    sourceId: suggestion.sourceId,
    paramsValue: paramsPatch,
    isCustom: true,
    origin: "fork",
    isLocalOnly: true,
  }
}
