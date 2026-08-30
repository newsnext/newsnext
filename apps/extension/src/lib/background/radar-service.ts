import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { RadarMatcher, RadarPageScript, ResolvedRadarSuggestion } from "@/lib/radar"
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

interface RadarResultCacheEntry {
  expiresAt: number
  promise: Promise<ResolvedRadarSuggestion[]>
  title?: string
  url: string
}

interface RadarRuntime {
  matcher: RadarMatcher
  sourceDescriptorsById: ReadonlyMap<string, SourceDescriptor>
}

const RADAR_RESULT_CACHE_DURATION_MS = 15_000
const radarResultCache = new Map<number, RadarResultCacheEntry>()
let radarRuntimePromise: Promise<RadarRuntime> | undefined

async function loadRadarRuntime(): Promise<RadarRuntime> {
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

  return await radarRuntimePromise
}

async function scanRadarSuggestions({
  tabId,
  title,
  url,
}: ResolveRadarSuggestionsInput, {
  matcher,
  sourceDescriptorsById,
}: RadarRuntime, pageScripts: readonly RadarPageScript[]): Promise<ResolvedRadarSuggestion[]> {
  const baseContext = { title, url }
  const [pageSelections, pageScriptValues] = await Promise.all([
    readRadarPageSelections(tabId, matcher.getPageQueries(baseContext)),
    readRadarPageScriptValues(tabId, pageScripts),
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

async function resolveRadarSuggestions(
  input: ResolveRadarSuggestionsInput,
): Promise<ResolvedRadarSuggestion[]> {
  const runtime = await loadRadarRuntime()
  const pageScripts = runtime.matcher.getPageScripts({ title: input.title, url: input.url })
  if (pageScripts.length > 0) {
    return await scanRadarSuggestions(input, runtime, pageScripts)
  }

  const cached = radarResultCache.get(input.tabId)
  if (
    cached
    && cached.expiresAt > Date.now()
    && cached.url === input.url
    && cached.title === input.title
  ) {
    return cached.promise
  }

  const promise = scanRadarSuggestions(input, runtime, pageScripts).catch((error) => {
    if (radarResultCache.get(input.tabId)?.promise === promise) {
      radarResultCache.delete(input.tabId)
    }
    throw error
  })
  radarResultCache.set(input.tabId, {
    expiresAt: Date.now() + RADAR_RESULT_CACHE_DURATION_MS,
    promise,
    title: input.title,
    url: input.url,
  })
  return promise
}

export function createBackgroundRadarService(): BackgroundRadarService {
  return {
    async resolveSuggestions(input): Promise<ResolvedRadarSuggestion[]> {
      return await resolveRadarSuggestions(input)
    },
  }
}
