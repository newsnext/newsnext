import type { ResolvedRadarSuggestion } from "./matcher"
import type { InstancePatch } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { mergeInstancePatch } from "@/lib/source"

export function createRadarLiveCard(
  suggestion: ResolvedRadarSuggestion,
  draftPatch?: InstancePatch,
): LiveCardViewModel {
  const { source } = suggestion
  const patch = mergeInstancePatch(suggestion.patch, draftPatch ?? {})

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
