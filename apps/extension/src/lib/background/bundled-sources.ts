import type { RuntimeSource } from "@newsnext/source-kit/types"
import bundledSourceRegistry from "@newsnext/registry" with { type: "json" }
import { resolveSources } from "@newsnext/registry/sources"
import { configureExternalSourcesLoader } from "@newsnext/source-kit/runtime"
import { syncConfiguredSourceRequestRules } from "./source-request-rules"

export async function loadBundledSources(): Promise<Record<string, RuntimeSource>> {
  return resolveSources(bundledSourceRegistry)
}

export function registerBundledSourcesLoader(): void {
  configureExternalSourcesLoader(loadBundledSources)
  void syncConfiguredSourceRequestRules().catch((error) => {
    console.error("Failed to synchronize bundled source request rules", error)
  })
}
