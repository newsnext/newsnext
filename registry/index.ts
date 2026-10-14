import type { RuntimeSource } from "@newsnext/source-kit/types"
import { resolveProvider } from "@newsnext/source-kit/registry"
import providers from "./sources.js"

export function resolveSources(): Record<string, RuntimeSource> {
  return Object.fromEntries(
    Object.entries(providers).flatMap(([providerId, config]) => (
      Object.entries(resolveProvider(providerId, config).sources)
        .map(([sourceId, source]) => [`${providerId}:${sourceId}`, source])
    )),
  )
}
