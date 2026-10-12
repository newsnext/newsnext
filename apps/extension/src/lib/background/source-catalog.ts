import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { SourceCatalog } from "@newsnext/source-kit/runtime"
import bundledSourceRegistry from "@newsnext/registry" with { type: "json" }
import { resolveSources } from "@newsnext/registry/sources"
import { resolveProvider, validateJsonSourceManifest } from "@newsnext/source-kit/registry"
import { configureSourceCatalog, mergeSourceCatalogs, resolveSourceCatalog } from "@newsnext/source-kit/runtime"
import { emitBackgroundEvent } from "./background-events"
import { createLocalSourceLoader } from "./local-source-runner"
import { refreshActiveRadarBadge } from "./radar-badge"
import { syncConfiguredSourceRequestRules } from "./source-request-rules"

let localCatalog: SourceCatalog = {}
let bundledCatalog: SourceCatalog | undefined

async function loadSourceCatalog(): Promise<SourceCatalog> {
  bundledCatalog ??= resolveSources(bundledSourceRegistry)
  // Local standalone/plugin precedence is already resolved by the connected host.
  return mergeSourceCatalogs(localCatalog, bundledCatalog)
}

function resolveLocalProvider(providerId: string, value: unknown): SourceCatalog {
  if (!value || typeof value !== "object" || !("kind" in value)) throw new Error("Invalid local Source provider")
  if (value.kind === "runtime" && "sources" in value) {
    const sources = resolveSourceCatalog(value.sources, descriptor => createLocalSourceLoader(descriptor.id))
    if (Object.keys(sources).some(id => !id.startsWith(`${providerId}:`))) {
      throw new Error(`Source catalog does not belong to Provider '${providerId}'`)
    }
    return sources
  }
  if (value.kind === "declarative" && "provider" in value) {
    validateJsonSourceManifest(value.provider, `Source provider '${providerId}'`)
    const provider = resolveProvider(providerId, value.provider as ProviderConfig)
    return Object.fromEntries(Object.entries(provider.sources).map(([key, source]) => [`${providerId}:${key}`, source]))
  }
  throw new Error("Unsupported local Source provider")
}

export function setLocalSourceProviders(providers: Record<string, unknown>): void {
  const catalog: SourceCatalog = {}
  for (const [providerId, provider] of Object.entries(providers)) {
    try {
      Object.assign(catalog, resolveLocalProvider(providerId, provider))
    } catch (error) {
      console.warn(`Skipping invalid local Source provider '${providerId}'`, error)
    }
  }
  localCatalog = catalog
  configureSourceCatalog(loadSourceCatalog)
  emitBackgroundEvent("source.catalogChanged", {})
  void Promise.all([syncConfiguredSourceRequestRules(), refreshActiveRadarBadge()]).catch((error) => {
    console.error("Failed to synchronize Source catalog rules or Radar badge", error)
  })
}

export function registerSourceCatalog(): void {
  setLocalSourceProviders({})
}
