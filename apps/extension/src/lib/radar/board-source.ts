import type { RadarSuggestion } from "./matcher"
import type { SourceInstancePatch } from "@/lib/source"
import type { BoardSource, SourceDescriptor } from "@/typings/source"
import { mergeSourceInstancePatch } from "@/lib/source"

export function createRadarBoardSource(
  suggestion: RadarSuggestion,
  descriptors: SourceDescriptor[],
  draftPatch?: SourceInstancePatch,
): BoardSource | null {
  const descriptor = descriptors.find(source => source.id === suggestion.sourceId)
  if (!descriptor) {
    return null
  }

  const patch = mergeSourceInstancePatch(suggestion.patch, draftPatch ?? {})

  return {
    ...descriptor,
    metadata: {
      ...descriptor.metadata,
      ...patch.metadata,
    },
    id: `tmp:radar:${suggestion.id}`,
    sourceId: suggestion.sourceId,
    boardId: null,
    paramsValue: patch.params,
  }
}
