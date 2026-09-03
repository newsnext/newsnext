import type { SourceRegistry } from "@newsnext/source-kit/registry"
import type { RuntimeSource } from "@newsnext/source-kit/types"
import type { SourceRegistryStateEntry } from "../source/registry-cache"
import bundledSourceRegistry from "@newsnext/registry" with { type: "json" }
import { resolveSources } from "@newsnext/registry/sources"
import {
  mergeSourceRegistries,
  parseSourceRegistry,
  SOURCE_REGISTRY_LIMITS,
} from "@newsnext/source-kit/registry"
import { configureExternalSourcesLoader } from "@newsnext/source-kit/runtime"
import { browser } from "#imports"
import { normalizePersistedSettings, PERSISTED_DATA_SLICES } from "../settings"
import {
  SOURCE_REGISTRIES_CACHE_KEY,
  SOURCE_REGISTRIES_REFRESH_KEY,
  SOURCE_REGISTRIES_STATE_KEY,
} from "../source/registry-cache"
import { syncConfiguredSourceRequestRules } from "./source-request-rules"

const REGISTRY_UPDATE_ALARM = "source-registry-update"
const REGISTRY_UPDATE_INTERVAL_MINUTES = 60
const REGISTRY_REQUEST_TIMEOUT_MS = 15_000

interface CachedRegistry {
  registry: SourceRegistry
  updatedAt: number
  url: string
}

export async function loadBundledSources(): Promise<Record<string, RuntimeSource>> {
  return resolveSources(bundledSourceRegistry)
}

async function downloadSourceRegistry(url: string): Promise<SourceRegistry> {
  const response = await fetch(url, {
    cache: "no-cache",
    signal: AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Registry download failed with HTTP ${response.status}`)
  }

  const serialized = await response.text()
  if (new TextEncoder().encode(serialized).byteLength > SOURCE_REGISTRY_LIMITS.maxBytes) {
    throw new Error(`Source registry exceeds ${SOURCE_REGISTRY_LIMITS.maxBytes} bytes`)
  }

  return parseSourceRegistry(JSON.parse(serialized))
}

async function loadRegistryUrls(): Promise<string[]> {
  const key = PERSISTED_DATA_SLICES.settings.key
  const stored = await browser.storage.local.get(key)
  return normalizePersistedSettings(stored[key]).general.registryUrls
}

async function loadCachedRegistries(urls: readonly string[]): Promise<Map<string, CachedRegistry>> {
  try {
    const stored = await browser.storage.local.get(SOURCE_REGISTRIES_CACHE_KEY)
    const cached = stored[SOURCE_REGISTRIES_CACHE_KEY]
    if (!Array.isArray(cached)) return new Map()

    const allowedUrls = new Set(urls)
    const registries = new Map<string, CachedRegistry>()
    for (const candidate of cached) {
      if (!isRecord(candidate) || typeof candidate.url !== "string" || !allowedUrls.has(candidate.url)) {
        continue
      }
      try {
        registries.set(candidate.url, {
          registry: parseSourceRegistry(candidate.registry),
          updatedAt: typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt)
            ? candidate.updatedAt
            : 0,
          url: candidate.url,
        })
      } catch (error) {
        console.warn(`Ignoring invalid cached source registry from ${candidate.url}`, error)
      }
    }
    return registries
  } catch (error) {
    console.warn("Failed to load cached source registries", error)
    return new Map()
  }
}

async function cacheSourceRegistries(registries: readonly CachedRegistry[]): Promise<void> {
  try {
    if (registries.length === 0) {
      await browser.storage.local.remove(SOURCE_REGISTRIES_CACHE_KEY)
    } else {
      await browser.storage.local.set({ [SOURCE_REGISTRIES_CACHE_KEY]: registries })
    }
  } catch (error) {
    console.warn("Failed to cache source registries", error)
  }
}

async function publishRegistryState(state: readonly SourceRegistryStateEntry[]): Promise<void> {
  await browser.storage.local.set({ [SOURCE_REGISTRIES_STATE_KEY]: state }).catch((error) => {
    console.warn("Failed to publish source registry state", error)
  })
}

async function resolveConfiguredSources(urls: readonly string[]): Promise<{
  registries: CachedRegistry[]
  sources: Record<string, RuntimeSource>
  state: SourceRegistryStateEntry[]
}> {
  if (urls.length === 0) {
    return { registries: [], sources: await loadBundledSources(), state: [] }
  }

  const cached = await loadCachedRegistries(urls)
  const results = await Promise.all(urls.map(async (url): Promise<{
    registry?: CachedRegistry
    state: SourceRegistryStateEntry
  }> => {
    const checkedAt = Date.now()
    try {
      const registry = await downloadSourceRegistry(url)
      return {
        registry: { url, registry, updatedAt: checkedAt },
        state: {
          checkedAt,
          sourceIds: Object.keys(registry),
          status: "ready",
          updatedAt: checkedAt,
          url,
        },
      }
    } catch (error) {
      console.warn(`Failed to update source registry from ${url}`, error)
      const cachedEntry = cached.get(url)
      const registry = cachedEntry?.registry
      return {
        registry: registry
          ? { url, registry, updatedAt: cachedEntry.updatedAt }
          : undefined,
        state: {
          checkedAt,
          error: error instanceof Error ? error.message : String(error),
          sourceIds: registry ? Object.keys(registry) : [],
          status: registry ? "stale" : "error",
          url,
          ...(cachedEntry?.updatedAt ? { updatedAt: cachedEntry.updatedAt } : {}),
        },
      }
    }
  }))
  const registries = results.flatMap(result => result.registry ? [result.registry] : [])

  const state = results.map(result => result.state)
  try {
    const merged = mergeSourceRegistries(
      bundledSourceRegistry,
      ...registries.map(entry => entry.registry),
    )
    return { registries, sources: resolveSources(merged), state }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await publishRegistryState(state.map(entry => ({
      ...entry,
      checkedAt: Date.now(),
      error: message,
      status: "error",
    })))
    throw error
  }
}

async function loadSources(): Promise<Record<string, RuntimeSource>> {
  try {
    const snapshot = await resolveConfiguredSources(await loadRegistryUrls())
    await activateRegistrySnapshot(snapshot, false)
    return snapshot.sources
  } catch (error) {
    console.warn("Failed to load configured source registries; using the bundled registry", error)
    const sources = await loadBundledSources()
    configureExternalSourcesLoader(async () => sources)
    return sources
  }
}

async function updateSourceRegistry(): Promise<void> {
  try {
    const snapshot = await resolveConfiguredSources(await loadRegistryUrls())
    await activateRegistrySnapshot(snapshot, true)
  } catch (error) {
    console.warn("Failed to update source registries", error)
  }
}

async function activateRegistrySnapshot(
  snapshot: Awaited<ReturnType<typeof resolveConfiguredSources>>,
  synchronizeRequestRules: boolean,
): Promise<void> {
  configureExternalSourcesLoader(async () => snapshot.sources)
  if (synchronizeRequestRules) {
    await syncConfiguredSourceRequestRules().catch((error) => {
      console.warn("Source registries updated, but request rules could not be synchronized", error)
    })
  }
  await cacheSourceRegistries(snapshot.registries)
  await publishRegistryState(snapshot.state)
}

function registryUrlsChanged(oldValue: unknown, newValue: unknown): boolean {
  const oldUrls = normalizePersistedSettings(oldValue).general.registryUrls
  const newUrls = normalizePersistedSettings(newValue).general.registryUrls
  return oldUrls.length !== newUrls.length || oldUrls.some((url, index) => url !== newUrls[index])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function registerSourceRegistryLoader(): void {
  configureExternalSourcesLoader(loadSources)

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REGISTRY_UPDATE_ALARM) {
      void updateSourceRegistry()
    }
  })
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return

    const change = changes[PERSISTED_DATA_SLICES.settings.key]
    if (change && registryUrlsChanged(change.oldValue, change.newValue)) {
      void updateSourceRegistry()
    }
    if (changes[SOURCE_REGISTRIES_REFRESH_KEY]) {
      void updateSourceRegistry()
    }
  })
  browser.alarms.create(REGISTRY_UPDATE_ALARM, {
    periodInMinutes: REGISTRY_UPDATE_INTERVAL_MINUTES,
  })
}
