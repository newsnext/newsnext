import type { KyInstance } from "ky"
import type { InferSourceParams, NewsItem, SourceDescriptor, SourceLoaderOutput, SourceLoaderResult, SourceParamSchemaMap, SourceSecrets } from "../models/index.js"

export type SourceFetch = KyInstance

/** Presentation evaluated after normalization; local modules may execute it through their host. */
export interface SourceAnnotationFormatter {
  (item: Readonly<NewsItem>, context?: SourceLoaderContext): string | undefined | Promise<string | undefined>
  /** Host adapters can format all normalized items in one call. */
  formatItems?: (items: readonly NewsItem[], context?: SourceLoaderContext) => Promise<string[]>
}

export interface SourceLoaderContext {
  // WHY: always use this bound client; ky.create()/global fetch would lose the abort signal, host queue, and capability checks.
  fetch: SourceFetch
  secrets?: SourceSecrets
  signal: AbortSignal
  updateSecrets?: (secrets: SourceSecrets) => Promise<void>
}

export type SourceLoaderDefinition<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = (
  params: InferSourceParams<TParams>,
  context: SourceLoaderContext,
) => Promise<SourceLoaderOutput>

export type SourceLoader<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = (
  params: InferSourceParams<TParams>,
  context: SourceLoaderContext,
) => Promise<SourceLoaderResult>

export interface RuntimeSource<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> extends Omit<SourceDescriptor<TParams>, "id"> {
  loader: SourceLoader<TParams>
}
export interface ProviderDefinition {
  sources: Record<string, RuntimeSource<any>>
}
