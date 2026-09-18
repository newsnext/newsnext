import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { RuntimeSource } from "@newsnext/source-kit/types"
import bundledSourceRegistry from "@newsnext/registry" with { type: "json" }
import { resolveSources } from "@newsnext/registry/sources"
import {
  flattenProviderConfig,
  resolveSourceRegistry,
} from "@newsnext/source-kit/registry"
import { configureExternalSourcesLoader } from "@newsnext/source-kit/runtime"
import { syncConfiguredSourceRequestRules } from "./source-request-rules"

let localProviders: Record<string, unknown> = {}

export async function loadBundledSources(): Promise<Record<string, RuntimeSource>> {
  return resolveSources(bundledSourceRegistry)
}

function resolveLocalSources(): Record<string, RuntimeSource> {
  const merged: Record<string, RuntimeSource> = {}
  for (const [providerId, provider] of Object.entries(localProviders)) {
    let flattened
    try {
      flattened = flattenProviderConfig(providerId, provider as ProviderConfig)
    } catch (error) {
      console.warn(`Skipping invalid local Source provider "${providerId}"`, error)
      continue
    }
    try {
      const resolved = resolveSourceRegistry(JSON.parse(JSON.stringify(flattened)))
      for (const [sourceId, source] of Object.entries(resolved)) {
        if (sourceId in merged) {
          console.warn(`Skipping duplicate local Source "${sourceId}"`)
          continue
        }
        merged[sourceId] = source
      }
    } catch (error) {
      console.warn(`Skipping invalid local Source provider "${providerId}"`, error)
    }
  }
  return merged
}

export async function loadAllSources(): Promise<Record<string, RuntimeSource>> {
  const bundled = await loadBundledSources()
  const local = resolveLocalSources()
  for (const sourceId of Object.keys(local)) {
    if (sourceId in bundled) {
      console.warn(`Local Source "${sourceId}" duplicates a bundled Source; the bundled Source wins`)
      delete local[sourceId]
    }
  }
  return { ...bundled, ...local }
}

export function setLocalSourceProviders(providers: Record<string, unknown>): void {
  localProviders = providers
  configureExternalSourcesLoader(loadAllSources)
  void syncConfiguredSourceRequestRules().catch((error) => {
    console.error("Failed to synchronize source request rules", error)
  })
}

export function registerBundledSourcesLoader(): void {
  setLocalSourceProviders({})
}
