import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { RadarMatcher, ResolvedRadarSuggestion } from "@/lib/radar"
import { getSourceCatalogRevision, loadSourceDescriptors, loadSources } from "@newsnext/source-kit/runtime"
import {
  createRadarMatcher,
  readRadarPageParamValues,
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
let radarRuntimeRevision = -1

function loadRadarRuntime(): Promise<RadarRuntime> {
  const revision = getSourceCatalogRevision()
  if (radarRuntimeRevision !== revision) {
    radarRuntimeRevision = revision
    radarRuntimePromise = undefined
  }
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
    if (radarRuntimeRevision === revision) radarRuntimePromise = undefined
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
  const [pageSelections, pageParamValues] = await Promise.all([
    readRadarPageSelections(tabId, matcher.getPageQueries(baseContext)),
    readRadarPageParamValues(tabId, matcher.getPageParams(baseContext)),
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
