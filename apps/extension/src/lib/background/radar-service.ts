import type { ResolvedRadarSuggestion } from "@/lib/radar"
import {
  readRadarPageParamValues,
  readRadarPageSelections,
} from "@/lib/radar"
import { loadRadarRuntime } from "./radar-runtime"

export interface ResolveRadarSuggestionsInput {
  tabId: number
  title?: string
  url: string
}

export interface BackgroundRadarService {
  resolveSuggestions: (input: ResolveRadarSuggestionsInput) => Promise<ResolvedRadarSuggestion[]>
}

async function scanRadarSuggestions({
  tabId,
  title,
  url,
}: ResolveRadarSuggestionsInput): Promise<ResolvedRadarSuggestion[]> {
  const { matcher, sourceDescriptorsById } = await loadRadarRuntime()
  const baseContext = { title, url }
  const [pageSelections, pageParamValues] = await Promise.all([
    readRadarPageSelections(tabId, matcher.getPageQueries(baseContext)),
    readRadarPageParamValues(tabId, url, matcher.getPageParams(baseContext)),
  ])
  return matcher.getSuggestions({
    ...baseContext,
    pageParamValues,
    pageSelections,
  }).flatMap((suggestion) => {
    const source = sourceDescriptorsById.get(suggestion.sourceId)
    return source ? [{ ...suggestion, source }] : []
  })
}

export function createBackgroundRadarService(): BackgroundRadarService {
  return { resolveSuggestions: scanRadarSuggestions }
}
