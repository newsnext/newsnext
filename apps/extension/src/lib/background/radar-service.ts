import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { RadarMatcher, ResolvedRadarSuggestion } from "@/lib/radar"
import { loadSourceDescriptors, loadSources } from "@newsnext/source-kit/runtime"
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
  resolveSuggestions: (input: ResolveRadarSuggestionsInput) => Promise<ResolvedRadarSuggestion[]>
}

interface RadarRuntime {
  matcher: RadarMatcher
  sourceDescriptorsById: ReadonlyMap<string, SourceDescriptor>
}

let radarRuntimePromise: Promise<RadarRuntime> | undefined

function loadRadarRuntime(): Promise<RadarRuntime> {
  radarRuntimePromise ??= Promise.all([
    loadSources(),
    loadSourceDescriptors(),
  ]).then(([sources, sourceDescriptors]) => ({
    matcher: createRadarMatcher(
      Object.entries(sources).map(([id, source]) => {
        const { loader: _loader, ...descriptor } = source
        return { ...descriptor, id }
      }),
    ),
    sourceDescriptorsById: new Map(sourceDescriptors.map(source => [source.id, source])),
  })).catch((error) => {
    radarRuntimePromise = undefined
    throw error
  })

  return radarRuntimePromise
}

async function scanRadarSuggestions({
  tabId,
  title,
  url,
}: ResolveRadarSuggestionsInput): Promise<ResolvedRadarSuggestion[]> {
  const { matcher, sourceDescriptorsById } = await loadRadarRuntime()
  const baseContext = { title, url }
  const [pageSelections, pageScriptValues] = await Promise.all([
    readRadarPageSelections(tabId, matcher.getPageQueries(baseContext)),
    readRadarPageScriptValues(tabId, matcher.getPageScripts(baseContext)),
  ])
  return matcher.getSuggestions({
    ...baseContext,
    pageScriptValues,
    pageSelections,
  }).flatMap((suggestion) => {
    const source = sourceDescriptorsById.get(suggestion.sourceId)
    return source ? [{ ...suggestion, source }] : []
  })
}

export function createBackgroundRadarService(): BackgroundRadarService {
  return { resolveSuggestions: scanRadarSuggestions }
}
