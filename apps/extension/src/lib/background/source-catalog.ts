import type { SourceCatalog } from "@newsnext/sdk/source/runtime"
import { resolveProvider } from "@newsnext/sdk/source/registry"
import { configureSourceCatalog, mergeSourceCatalogs } from "@newsnext/sdk/source/runtime"
import { emitBackgroundEvent } from "./background-events"
import { resolveBundledSources } from "./bundled-sources"
import { bindLocalSourceProvider, createLocalSourceLoader } from "./local-source-runner"
import { refreshActiveRadarBadge } from "./radar-badge"
import { syncConfiguredSourceRequestRules } from "./source-request-rules"

let localCatalog: SourceCatalog = {}
let bundledCatalog: SourceCatalog | undefined

async function loadSourceCatalog(): Promise<SourceCatalog> {
  bundledCatalog ??= resolveBundledSources()
  // Local standalone/plugin precedence is already resolved by the connected host.
  return mergeSourceCatalogs(localCatalog, bundledCatalog)
}

function resolveLocalProvider(providerId: string, value: unknown): SourceCatalog {
  if (!value || typeof value !== "object" || !("kind" in value) || !("provider" in value)) {
    throw new Error("Invalid local Source provider")
  }
  let provider: unknown = value.provider
  let session: { revision: string, requiresSession: (key: string) => boolean } | undefined
  if (value.kind === "module" && "revision" in value && typeof value.revision === "string") {
    const bound = bindLocalSourceProvider(provider)
    provider = bound.provider
    session = { revision: value.revision, requiresSession: bound.requiresSession }
  } else if (value.kind !== "declarative") {
    throw new Error("Unsupported local Source provider")
  }
  const resolved = resolveProvider(providerId, provider)
  return Object.fromEntries(Object.entries(resolved.sources).map(([key, source]) => {
    const id = `${providerId}:${key}`
    return [id, session?.requiresSession(key)
      ? { ...source, loader: createLocalSourceLoader(id, session.revision, source.loader) }
      : source]
  }))
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
