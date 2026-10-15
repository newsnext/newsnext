import type { SourceProvider } from "../../models/index.js"
import type { SourceConfig } from "../core/resolver"
import type { ProviderDefinition } from "../types"
import type { ProviderConfig } from "./types"
import { firstJsonSchemaIssue, sourceProviderSchema } from "../../schemas/index.js"
import { assignSourceDefaults, mergeSourceVars, resolveRuntimeSource } from "../core/resolver"
import { serializeLocalProvider } from "../local/provider"
import { isRecord, isStructuredLoaderType, isValidIdSegment, parseRegistrySourceId } from "./validation"

/** Validate original definitions and resolve JSON and module Providers through the same engine. */
export function resolveProvider(providerId: string, value: unknown): ProviderDefinition {
  if (!isValidIdSegment(providerId)) throw new Error(`Invalid provider ID "${providerId}"`)
  serializeLocalProvider(value)
  const issue = firstJsonSchemaIssue(sourceProviderSchema, value)
  if (issue) {
    throw new TypeError(`Invalid Source provider '${providerId}'${issue.instancePath.replaceAll("/", ".")}: ${issue.message}`)
  }
  const provider = value as ProviderConfig
  const metadata: SourceProvider = {
    title: provider.title,
    category: provider.category,
    icon: provider.icon,
    color: provider.color,
  }
  const sources = Object.fromEntries(Object.entries(provider.sources).map(([key, source]) => {
    const id = `${providerId}:${key}`
    parseRegistrySourceId(id)
    const config = assignSourceDefaults(source, provider.defaults ?? {})
    const loader = config.loader
    if (
      !isRecord(loader)
      || (loader.type === "custom"
        ? typeof loader.load !== "function"
        : !isStructuredLoaderType(loader.type) || !("url" in loader) || typeof loader.url !== "string" || loader.url.length === 0)
    ) {
      throw new Error(`Source "${id}" is missing a valid loader`)
    }
    return [key, resolveRuntimeSource(id, {
      ...config,
      vars: mergeSourceVars(provider.defaults?.vars, source.vars),
    } as SourceConfig, metadata)]
  }))
  return { sources }
}
