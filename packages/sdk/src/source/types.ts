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
  /**
   * Browser-backed ky client with the execution signal, request queue, and capability checks.
   * Local JavaScript callbacks may use `fetch.extend({ fetch: globalThis.fetch })`
   * for host-side networking while retaining ky's execution signal, retries, and timeout.
   * Native requests do not use browser cookies, request rules, or network permission checks.
   * Direct global fetch is also supported locally; pass `signal` explicitly.
   */
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
