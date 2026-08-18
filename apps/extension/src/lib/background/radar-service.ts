import type { RadarMatcher, RadarSuggestion } from "@/lib/radar"
import { loadSources } from "@newsnext/source-kit/runtime"
import {
  createRadarMatcher,
  readRadarPageScriptValues,
  readRadarPageSelections,
} from "@/lib/radar"

export interface ResolveRadarSuggestionsInput {
  tabId: number
  title?: string
  url: string
}

export interface BackgroundRadarService {
  resolveSuggestions: (input: ResolveRadarSuggestionsInput) => Promise<RadarSuggestion[]>
}

let radarMatcherPromise: Promise<RadarMatcher> | undefined

async function loadRuntimeRadarMatcher(): Promise<RadarMatcher> {
  radarMatcherPromise ??= loadSources().then(sources => createRadarMatcher(
    Object.entries(sources).map(([id, source]) => {
      const { loader: _loader, ...descriptor } = source
      return { ...descriptor, id }
    }),
  ))
  return radarMatcherPromise
}

export function createBackgroundRadarService(): BackgroundRadarService {
  return {
    async resolveSuggestions({ tabId, title, url }): Promise<RadarSuggestion[]> {
      const matcher = await loadRuntimeRadarMatcher()
      const baseContext = { title, url }
      const [pageSelections, pageScriptValues] = await Promise.all([
        readRadarPageSelections(tabId, matcher.getPageQueries(baseContext)),
        readRadarPageScriptValues(tabId, matcher.getPageScripts(baseContext)),
      ])
      return matcher.getSuggestions({
        ...baseContext,
        pageScriptValues,
        pageSelections,
      })
    },
  }
}
