import type { LiveCardPatch } from "./live-card.js"
import type { SourceDescriptor } from "./source.js"

export interface RadarSuggestion {
  id: string
  ruleId: string
  sourceId: string
  patch: LiveCardPatch
}

export interface ResolvedRadarSuggestion extends RadarSuggestion {
  source: SourceDescriptor
}
