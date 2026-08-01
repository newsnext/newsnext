import type { Options } from "ky"
import type {
  NewsItem,
  SourceFetch,
  SourcePresentationMetadata,
  SourceTemplateVars,
} from "../../types"
import { createSourceFetch, sessionFetch } from "../../utils"

export interface TimestampSortableLoaderOptions {
  sortByTimestamp?: boolean
}

export interface LoaderFetchContext {
  fetch: SourceFetch
  signal?: AbortSignal
}

export interface LoaderRequestContext extends LoaderFetchContext {
  url: string
}

interface DefaultLoaderRequest {
  fetchOptions?: Options
  request?: never
}

interface CustomLoaderRequest {
  fetchOptions?: never
  request: (context: LoaderRequestContext) => Promise<Response>
}

export type LoaderRequestOptions = DefaultLoaderRequest | CustomLoaderRequest

export interface LoaderContext extends Partial<LoaderFetchContext> {
  vars?: SourceTemplateVars
  params?: Record<string, unknown>
}

function resolveLoaderFetchContext(
  context: LoaderContext,
): LoaderFetchContext {
  return {
    fetch: context.fetch
      ?? (context.signal ? createSourceFetch(context.signal) : sessionFetch),
    signal: context.signal,
  }
}

export function requestLoaderResponse(
  options: { url: string } & LoaderRequestOptions,
  context: LoaderContext,
): Promise<Response> {
  const fetchContext = resolveLoaderFetchContext(context)
  return options.request
    ? options.request({ ...fetchContext, url: options.url })
    : fetchContext.fetch(options.url, options.fetchOptions)
}

export type LoaderMetadataFields<TField> = {
  [K in keyof SourcePresentationMetadata]?: TField
}

export interface LoaderFields<TField> {
  title: TField
  url: TField
  mobileUrl?: TField
  timestamp?: TField
  inline?: {
    text?: TField
    html?: TField
    mark?: TField
    icon?: TField
  }
  preview?: {
    text?: TField
    html?: TField
    picture?: TField
    iframe?: TField
  }
}

export function sortLoaderItemsByTimestamp(
  items: NewsItem[],
  enabled: boolean | undefined,
): NewsItem[] {
  if (!enabled) return items

  return items.sort((left, right) => {
    if (left.timestamp === undefined) return right.timestamp === undefined ? 0 : 1
    if (right.timestamp === undefined) return -1
    return right.timestamp - left.timestamp
  })
}

export function validateSortByTimestamp(value: unknown, location: string): void {
  if (value === undefined) return
  if (typeof value !== "boolean") {
    throw new TypeError(`${location} must be a boolean`)
  }
}

export function normalizeLoaderMetadata(
  values: Record<string, unknown>,
): SourcePresentationMetadata | undefined {
  const metadata = Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => (
      value === undefined || value === null || value === ""
        ? []
        : [[key, String(value)]]
    )),
  ) as SourcePresentationMetadata

  return Object.keys(metadata).length > 0 ? metadata : undefined
}
