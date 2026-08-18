import type { RuntimeSource } from "@newsnext/source-kit/types"
import bundledSourceRegistry from "@newsnext/registry" with { type: "json" }
import { resolveSources } from "@newsnext/registry/sources"
import { configureExternalSourcesLoader } from "@newsnext/source-kit/runtime"

export async function loadBundledSources(): Promise<Record<string, RuntimeSource>> {
  return resolveSources(bundledSourceRegistry)
}

export function registerSourceRegistryLoader(): void {
  configureExternalSourcesLoader(loadBundledSources)
}
