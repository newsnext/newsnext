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
  publishedAt?: TField
  updatedAt?: TField
  author?: {
    name: TField
    home?: TField
  }
  stats?: {
    likes?: TField
    comments?: TField
    reposts?: TField
    views?: TField
    score?: TField
  }
  attributes?: Record<string, TField>
  icon?: {
    src: TField
    kind?: TField
    label?: TField
  }
  mark?: {
    src: TField
    kind?: TField
    label?: TField
  }
  content?: {
    text?: TField
    html?: TField
    pictures?: TField
    iframe?: TField
  }
}

export function isCompleteLoaderFieldGroup(
  group: string,
  value: Record<string, unknown>,
): boolean {
  if (Object.keys(value).length === 0) return false
  if (group === "author") return value.name !== undefined
  if (group === "icon" || group === "mark") return value.src !== undefined
  return true
}

export function normalizeLoaderNestedValue(group: string, value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined
  if (group !== "stats") return value

  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

export function sortLoaderItemsByTimestamp(
  items: NewsItem[],
  enabled: boolean | undefined,
): NewsItem[] {
  if (!enabled) return items

  return items.sort((left, right) => {
    const leftTime = left.publishedAt ?? left.updatedAt
    const rightTime = right.publishedAt ?? right.updatedAt
    if (leftTime === undefined) return rightTime === undefined ? 0 : 1
    if (rightTime === undefined) return -1
    return rightTime - leftTime
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
