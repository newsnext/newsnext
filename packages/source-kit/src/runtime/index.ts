import type {
  InferSourceParams,
  RuntimeSource,
  SourceDescriptor,
  SourceParamSchemaMap,
} from "../types"
import type { SourceCatalog } from "./catalog"
import { parseSourceParams } from "../core/params"
import { parseRegistrySourceId } from "../registry/validation"
import { SourceParamValueError } from "../types"

export { mergeSourceCatalogs } from "./catalog"
export type { SourceCatalog } from "./catalog"

export type SourceErrorCode
  = | "SOURCE_NOT_FOUND"
    | "INVALID_PARAMS"
    | "INVALID_FORMAT"
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
let sourceCatalogLoader: SourceCatalogLoader = async () => ({})
let sourceCatalogPromise: Promise<SourceCatalog> | undefined

/** Consumers with derived indexes use this revision to retire stale catalog data. */
export function getSourceCatalogRevision(): number {
  return sourceGeneration
}

export type SourceCatalogLoader = () => Promise<SourceCatalog>

/** Supply the complete catalog; origins and execution backends belong to the host. */
export function configureSourceCatalog(loader: SourceCatalogLoader): void {
  sourceGeneration += 1
  sourceCatalogLoader = loader
  sourceCatalogPromise = undefined
}

function loadSourceCatalog(): Promise<SourceCatalog> {
  const generation = sourceGeneration
  sourceCatalogPromise ??= sourceCatalogLoader().catch((error) => {
    if (generation === sourceGeneration) sourceCatalogPromise = undefined
    throw error
  })
  return sourceCatalogPromise
}

export async function loadSources(): Promise<Record<string, RuntimeSource>> {
  return loadSourceCatalog()
}

export async function loadSourceDescriptors(): Promise<SourceDescriptor[]> {
  const sources = await loadSources()
  return Object.entries(sources).map(([id, source]) => toSourceDescriptor(id, source))
}

/** Resolve one Source without loading the whole registry into the caller. */
export async function loadSourceDescriptor(sourceId: string): Promise<SourceDescriptor> {
  return toSourceDescriptor(sourceId, await resolveSource(sourceId))
}

export function toSourceDescriptor(id: string, source: RuntimeSource): SourceDescriptor {
  const { loader: _loader, ...descriptor } = source
  return {
    ...descriptor,
    id,
  }
}

export function parseSourceId(sourceId: string): ParsedSourceId {
  try {
    const [provider, source] = parseRegistrySourceId(sourceId)
    return { provider, source }
  } catch {
    throw new SourceRuntimeError("INVALID_FORMAT", "Invalid source ID format. Expected 'provider:source'")
  }
}

export async function resolveSource(sourceId: string): Promise<RuntimeSource<any>> {
  const { provider, source } = parseSourceId(sourceId)
  const sources = await loadSourceCatalog()
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
