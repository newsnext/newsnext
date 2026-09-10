import type { ResolvedRadarSuggestion } from "./matcher"
import type { LiveCardPatch } from "@/lib/source/live-cards"
import type { LiveCardViewModel } from "@/typings/source"
import { applyLiveCardPatch, mergeLiveCardPatch } from "@/lib/source/live-cards"

export function createRadarLiveCard(
  suggestion: ResolvedRadarSuggestion,
  draftPatch?: LiveCardPatch,
): LiveCardViewModel {
  const { source } = suggestion
  const patch = mergeLiveCardPatch(suggestion.patch, draftPatch ?? {})

  return applyLiveCardPatch({
    ...source,
    id: `tmp:radar:${suggestion.id}`,
    sourceId: suggestion.sourceId,
    boardId: null,
  }, patch)
}
