import type { RuntimeSource, SourceDescriptor, SourceLoader } from "../types"
import { parseSourceDescriptor } from "@newsnext/sdk/schemas"
import { isRecord, parseRegistrySourceId } from "../registry/validation"

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

/** Bind an execution backend to serialized descriptors without re-resolving authoring config. */
export function resolveSourceCatalog(
  value: unknown,
  createLoader: (descriptor: SourceDescriptor) => SourceLoader,
): SourceCatalog {
  if (!isRecord(value)) throw new TypeError("Source catalog must be an object")
  return Object.fromEntries(Object.entries(value).map(([id, input]) => {
    parseRegistrySourceId(id)
    const descriptor = parseSourceDescriptor(input)
    if (descriptor.id !== id) throw new TypeError(`Source catalog ID '${id}' does not match its descriptor`)
    const { id: _id, ...source } = descriptor
    return [id, { ...source, loader: createLoader(descriptor) }]
  }))
}
