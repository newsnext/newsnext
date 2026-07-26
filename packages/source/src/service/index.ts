import type {
  InferSourceParams,
  ProviderDefinition,
  RuntimeSource,
  SourceDescriptor,
  SourceParamSchemaMap,
} from "@newsnext/source/typings"
import { getFavicon } from "@newsnext/shared/utils"
import { SourceParamValueError } from "@newsnext/source/typings"
import { parseSourceParams } from "@newsnext/source/utils/params"
import { providers as typescriptProviders } from "../index"
import { resolveSourceRegistry } from "../utils/source"

export type SourceErrorCode
  = | "SOURCE_NOT_FOUND"
    | "INVALID_PARAMS"
    | "INVALID_FORMAT"
    | "LOADER_NOT_FOUND"
    | "PROVIDER_NOT_FOUND"

export class SourceServiceError extends Error {
  readonly code: SourceErrorCode

  constructor(code: SourceErrorCode, message: string) {
    super(message)
    this.name = "SourceServiceError"
    this.code = code
  }
}

export interface ParsedSourceId {
  provider: string
  source: string
}

export interface PreparedSourceRequest<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  source: RuntimeSource<TParams>
  params: InferSourceParams<TParams>
}

const runtimeTypescriptProviders = typescriptProviders as Record<string, ProviderDefinition>
let registryGeneration = 0
let registryLoader: SourceRegistryLoader = async () => ({})
let registrySources: Record<string, RuntimeSource> | undefined
let registrySourcesPromise: Promise<Record<string, RuntimeSource>> | undefined

export type SourceRegistryLoader = () => Promise<unknown>

function setSourceRegistryLoader(loader: SourceRegistryLoader): void {
  registryGeneration += 1
  registryLoader = loader
  registrySources = undefined
  registrySourcesPromise = undefined
}

export function configureSourceRegistryLoader(loader: SourceRegistryLoader): () => void {
  const previousLoader = registryLoader
  setSourceRegistryLoader(loader)
  return () => setSourceRegistryLoader(previousLoader)
}

function loadRegistrySources(): Promise<Record<string, RuntimeSource>> {
  if (registrySources) {
    return Promise.resolve(registrySources)
  }
  if (registrySourcesPromise) {
    return registrySourcesPromise
  }

  const generation = registryGeneration
  registrySourcesPromise = registryLoader()
    .then(resolveSourceRegistry)
    .then((sources) => {
      if (generation === registryGeneration) {
        registrySources = sources
      }
      return sources
    })
    .finally(() => {
      if (generation === registryGeneration) {
        registrySourcesPromise = undefined
      }
    })

  return registrySourcesPromise
}

export async function loadSources(): Promise<Record<string, RuntimeSource>> {
  const typescriptSources = Object.fromEntries(
    Object.entries(runtimeTypescriptProviders).flatMap(([providerId, provider]) =>
      Object.entries(provider.sources).map(([sourceId, source]) => [
        `${providerId}:${sourceId}`,
        source,
      ]),
    ),
  )

  return {
    ...typescriptSources,
    ...await loadRegistrySources(),
  }
}

export async function loadSourceDescriptors(): Promise<SourceDescriptor[]> {
  const sources = await loadSources()
  return Object.entries(sources).map(([id, source]) => {
    const { disable: _disable, key: _key, loader: _loader, ...descriptor } = source
    return {
      ...descriptor,
      icon: descriptor.icon ?? (descriptor.home ? getFavicon(descriptor.home) : undefined),
      id,
    }
  })
}

export function parseSourceId(sourceId: string): ParsedSourceId {
  const [provider, source, extra] = sourceId.split(":")

  if (!provider || !source || extra !== undefined) {
    throw new SourceServiceError(
      "INVALID_FORMAT",
      "Invalid source ID format. Expected 'provider:source'",
    )
  }

  return { provider, source }
}

export async function resolveSource(sourceId: string): Promise<RuntimeSource<any>> {
  const { provider, source } = parseSourceId(sourceId)
  const providerDefinition = runtimeTypescriptProviders[provider]

  if (providerDefinition) {
    const resolvedSource = providerDefinition.sources[source]
    if (!resolvedSource) {
      throw new SourceServiceError(
        "SOURCE_NOT_FOUND",
        `Source '${source}' not found in provider '${provider}'`,
      )
    }

    return resolvedSource
  }

  const registrySources = await loadRegistrySources()
  const resolvedSource = registrySources[sourceId]
  if (!resolvedSource) {
    const hasProvider = Object.keys(registrySources).some(id => id.startsWith(`${provider}:`))
    throw new SourceServiceError(
      hasProvider ? "SOURCE_NOT_FOUND" : "PROVIDER_NOT_FOUND",
      hasProvider
        ? `Source '${source}' not found in provider '${provider}'`
        : `Provider '${provider}' not found`,
    )
  }

  return resolvedSource
}

export function normalizeSourceParams<TParams extends SourceParamSchemaMap>(
  source: Pick<RuntimeSource<TParams>, "params">,
  queryParams: Record<string, unknown> = {},
) {
  try {
    return parseSourceParams(source.params, queryParams)
  } catch (error) {
    if (error instanceof SourceParamValueError) {
      throw new SourceServiceError("INVALID_PARAMS", error.message)
    }

    throw error
  }
}

export async function prepareSourceRequest<TParams extends SourceParamSchemaMap>(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
): Promise<PreparedSourceRequest<TParams>> {
  const source = await resolveSource(sourceId) as RuntimeSource<TParams>
  const params = normalizeSourceParams(source, queryParams)

  return {
    source,
    params,
  }
}
