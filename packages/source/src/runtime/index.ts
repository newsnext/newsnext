import type {
  InferSourceParams,
  RuntimeSource,
  SourceDescriptor,
  SourceParamSchemaMap,
} from "@newsnext/source/types"
import { SourceParamValueError } from "@newsnext/source/types"
import { parseSourceParams } from "../core/params"

export type SourceErrorCode
  = | "SOURCE_NOT_FOUND"
    | "INVALID_PARAMS"
    | "INVALID_FORMAT"
    | "LOADER_NOT_FOUND"
    | "PROVIDER_NOT_FOUND"

export class SourceRuntimeError extends Error {
  readonly code: SourceErrorCode

  constructor(code: SourceErrorCode, message: string) {
    super(message)
    this.name = "SourceRuntimeError"
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

let sourceGeneration = 0
let externalSourcesLoader: ExternalSourcesLoader = async () => ({})
let externalSources: Record<string, RuntimeSource> | undefined
let externalSourcesPromise: Promise<Record<string, RuntimeSource>> | undefined

export type ExternalSourcesLoader = () => Promise<Record<string, RuntimeSource>>

function setExternalSourcesLoader(loader: ExternalSourcesLoader): void {
  sourceGeneration += 1
  externalSourcesLoader = loader
  externalSources = undefined
  externalSourcesPromise = undefined
}

export function configureExternalSourcesLoader(loader: ExternalSourcesLoader): () => void {
  const previousLoader = externalSourcesLoader
  setExternalSourcesLoader(loader)
  return () => setExternalSourcesLoader(previousLoader)
}

function loadExternalSources(): Promise<Record<string, RuntimeSource>> {
  if (externalSources) {
    return Promise.resolve(externalSources)
  }
  if (externalSourcesPromise) {
    return externalSourcesPromise
  }

  const generation = sourceGeneration
  externalSourcesPromise = externalSourcesLoader()
    .then((sources) => {
      if (generation === sourceGeneration) {
        externalSources = sources
      }
      return sources
    })
    .finally(() => {
      if (generation === sourceGeneration) {
        externalSourcesPromise = undefined
      }
    })

  return externalSourcesPromise
}

export async function loadSources(): Promise<Record<string, RuntimeSource>> {
  return loadExternalSources()
}

export async function loadSourceDescriptors(): Promise<SourceDescriptor[]> {
  const sources = await loadSources()
  return Object.entries(sources).map(([id, source]) => {
    const { disable: _disable, key: _key, loader: _loader, ...descriptor } = source
    return {
      ...descriptor,
      id,
    }
  })
}

export function parseSourceId(sourceId: string): ParsedSourceId {
  const [provider, source, extra] = sourceId.split(":")

  if (!provider || !source || extra !== undefined) {
    throw new SourceRuntimeError(
      "INVALID_FORMAT",
      "Invalid source ID format. Expected 'provider:source'",
    )
  }

  return { provider, source }
}

export async function resolveSource(sourceId: string): Promise<RuntimeSource<any>> {
  const { provider, source } = parseSourceId(sourceId)
  const sources = await loadExternalSources()
  const resolvedSource = sources[sourceId]
  if (!resolvedSource) {
    const hasProvider = Object.keys(sources).some(id => id.startsWith(`${provider}:`))
    throw new SourceRuntimeError(
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
      throw new SourceRuntimeError("INVALID_PARAMS", error.message)
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
