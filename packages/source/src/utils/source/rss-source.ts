import type { RSSHubOption, RSSHubResponse } from "../../typings"
import type {
  InferSourceParams,
  SourceParamSchemaMap,
  SourceRegistration,
} from "../../typings/sources"
import defu from "defu"
import { createLoader } from "."
import { myFetch } from "../fetch"
import { rss2json } from "./rss2json"

interface RSSHubLoaderOptions {
  route: string
  host?: string
  options?: RSSHubOption
  type?: SourceRegistration["type"]
}

export const $rssLoader = createLoader<{ url: string }>(async ({ url }) => {
  const data = await rss2json(url)
  if (!data?.items.length) throw new Error("Cannot fetch rss data")
  return data.items.map(item => ({
    title: item.title,
    url: item.link,
    timestamp: item.created ? new Date(item.created).getTime() : undefined,
  }))
})

export const $rssHubLoader = createLoader<RSSHubLoaderOptions>(async ({ route, host, options: RSSHubOptions, type }) => {
  if (!host) host = "https://rsshub.rssforever.com"
  const RSSHubBase = host
  const url = new URL(route, RSSHubBase)
  url.searchParams.set("format", "json")
  RSSHubOptions = defu<RSSHubOption, RSSHubOption[]>(RSSHubOptions, {
    sorted: type !== "hottest",
  })

  Object.entries(RSSHubOptions).forEach(([key, value]) => {
    url.searchParams.set(key, (value as any).toString())
  })
  const data: RSSHubResponse = await myFetch(url.toString(), {
    timeout: 5000,
  })
  return data.items.map(item => ({
    title: item.title,
    url: item.url,
    timestamp: new Date(item.date_published).getTime(),
  }))
})

export function $rssSource<P extends SourceParamSchemaMap>(
  registration: Omit<SourceRegistration<P>, "loader" | "params"> & { params: P },
  options: (params: InferSourceParams<P>) => { url: string },
): SourceRegistration<P>
export function $rssSource(
  registration: Omit<SourceRegistration<Record<string, never>>, "loader" | "params">,
  options: () => { url: string },
): SourceRegistration<Record<string, never>>
export function $rssSource(registration: unknown, options: unknown): SourceRegistration<any> {
  return {
    ...(registration as object),
    ...$rssLoader(options as any),
  } as SourceRegistration<any>
}

export function $rssHubSource<P extends SourceParamSchemaMap>(
  registration: Omit<SourceRegistration<P>, "loader" | "params"> & { params: P },
  options: (params: InferSourceParams<P>) => { route: string, host?: string, options?: RSSHubOption },
): SourceRegistration<P>
export function $rssHubSource(
  registration: Omit<SourceRegistration<Record<string, never>>, "loader" | "params">,
  options: () => { route: string, host?: string, options?: RSSHubOption },
): SourceRegistration<Record<string, never>>
export function $rssHubSource(registration: unknown, options: unknown): SourceRegistration<any> {
  const sourceRegistration = registration as SourceRegistration<any>
  return {
    ...sourceRegistration,
    ...$rssHubLoader((params: InferSourceParams<any>) => {
      const sourceOptions = (options as (params: InferSourceParams<any>) => RSSHubLoaderOptions)(params)
      return {
        ...sourceOptions,
        type: sourceRegistration.type ?? sourceOptions.type,
      }
    }),
  } as SourceRegistration<any>
}
