import type { ResolvedRadarSuggestion } from "./matcher"
import type { SourceInstancePatch } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { mergeSourceInstancePatch } from "@/lib/source"

export function createRadarLiveCard(
  suggestion: ResolvedRadarSuggestion,
  draftPatch?: SourceInstancePatch,
): LiveCardViewModel {
  const { source } = suggestion
  const patch = mergeSourceInstancePatch(suggestion.patch, draftPatch ?? {})

  return {
    ...source,
    metadata: {
      ...source.metadata,
      ...patch.metadata,
    },
    id: `tmp:radar:${suggestion.id}`,
    sourceId: suggestion.sourceId,
    collectionId: null,
    paramsValue: patch.params,
  }
}
