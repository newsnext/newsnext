import type { RadarSuggestion } from "./matcher"
import type { SourceInstancePatch } from "@/lib/source"
import type { LiveCardViewModel, SourceDescriptor } from "@/typings/source"
import { mergeSourceInstancePatch } from "@/lib/source"

export function createRadarLiveCard(
  suggestion: RadarSuggestion,
  descriptors: SourceDescriptor[],
  draftPatch?: SourceInstancePatch,
): LiveCardViewModel | null {
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
    collectionId: null,
    paramsValue: patch.params,
  }
}
