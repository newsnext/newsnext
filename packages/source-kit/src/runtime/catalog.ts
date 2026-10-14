import type { RuntimeSource } from "../types"
import { parseRegistrySourceId } from "../registry/validation"

export type SourceCatalog = Record<string, RuntimeSource>

/** Catalogs are ordered from highest priority to lowest; a Provider is replaced as a unit. */
export function mergeSourceCatalogs(...catalogs: SourceCatalog[]): SourceCatalog {
  const merged: SourceCatalog = {}
  const selectedProviders = new Set<string>()
  for (const catalog of catalogs) {
    const currentProviders = new Set<string>()
    for (const [id, source] of Object.entries(catalog)) {
      const [providerId] = parseRegistrySourceId(id)
      currentProviders.add(providerId)
      if (!selectedProviders.has(providerId)) merged[id] = source
    }
    for (const providerId of currentProviders) selectedProviders.add(providerId)
  }
  return merged
}
