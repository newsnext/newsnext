import type { InstancePatch } from "./instance.js"
import type { SourceDescriptor } from "./source.js"

export interface RadarSuggestion {
  id: string
  ruleId: string
  sourceId: string
  patch: InstancePatch
}

export interface ResolvedRadarSuggestion extends RadarSuggestion {
  source: SourceDescriptor
}
