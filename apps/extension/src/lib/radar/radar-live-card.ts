import type { ResolvedRadarSuggestion } from "./matcher"
import type { InstancePatch } from "@/lib/source/live-cards"
import type { LiveCardViewModel } from "@/typings/source"
import { applyInstancePatch, mergeInstancePatch } from "@/lib/source/live-cards"

export function createRadarLiveCard(
  suggestion: ResolvedRadarSuggestion,
  draftPatch?: InstancePatch,
): LiveCardViewModel {
  const { source } = suggestion
  const patch = mergeInstancePatch(suggestion.patch, draftPatch ?? {})

  return applyInstancePatch({
    ...source,
    id: `tmp:radar:${suggestion.id}`,
    sourceId: suggestion.sourceId,
    boardId: null,
  }, patch)
}
