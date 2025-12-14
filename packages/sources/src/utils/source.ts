import type { RSSHubOption, RSSHubResponse } from "../typings"
import type { InitalSource, NewsItem, Parameter, SourceWithoutNamespaceKey } from "../typings/sources"
import defu from "defu"
import { Time } from "../typings/constants"
import { typeSafeObjectOmit } from "../typings/type.util"
import { myFetch } from "./fetch"
import { rss2json } from "./rss2json"

export function defineSource(source: InitalSource): Record<string, SourceWithoutNamespaceKey> {
  const _: Record<string, SourceWithoutNamespaceKey> = {}
  const _default = {
    ...typeSafeObjectOmit(source, "sub"),
    interval: source.interval ?? Time.Default,
    category: source.category ?? "others",
  } as SourceWithoutNamespaceKey
  if (source?.sub?.length) {
    source.sub.forEach((subSource) => {
      _[subSource.id] = { ..._default, ...subSource }
    })
  } else if (_default.getter!) {
    _.default = _default
  }
  return _
}

export function defineRSSSourceGetter(
  options: () => { url: string },
): { getter: () => Promise<NewsItem[]> }
export function defineRSSSourceGetter<P extends Record<string, Parameter> = Record<string, Parameter>>(
  params: P,
  options: (params: { [K in keyof P]: P[K]["default"] }) => { url: string },
): { params: P, getter: (params: any) => Promise<NewsItem[]> }
export function defineRSSSourceGetter(
  ...args: any[]
): any {
  const params = args.length === 2 ? args[0] : {}
  const options = args.length === 2 ? args[1] : args[0]

  return defineSourceGetterWithParams(params, async (paramsValue) => {
    const { url } = options(paramsValue)
    const data = await rss2json(url)
    if (!data?.items.length) throw new Error("Cannot fetch rss data")
    return data.items.map(item => ({
      title: item.title,
      url: item.link,
      updated: item.created,
    }))
  })
}

export function defineRSSHubSourceGetter(
  options: () => { route: string, host?: string, options?: RSSHubOption },
): { getter: () => Promise<NewsItem[]> }
export function defineRSSHubSourceGetter<P extends Record<string, Parameter> = Record<string, Parameter>>(
  params: P,
  options: (params: { [K in keyof P]: P[K]["default"] }) => { route: string, host?: string, options?: RSSHubOption },
): { params: P, getter: (params: any) => Promise<NewsItem[]> }
export function defineRSSHubSourceGetter(
  ...args: any[]
): any {
  const params = args.length === 2 ? args[0] : {}
  const options = args.length === 2 ? args[1] : args[0]

  return defineSourceGetterWithParams(params, async (paramsValue) => {
    let { route, host, options: RSSHubOptions } = options(paramsValue)
    if (!host) host = "https://rsshub.rssforever.com"
    // "https://rsshub.pseudoyu.com"
    const RSSHubBase = host
    const url = new URL(route, RSSHubBase)
    url.searchParams.set("format", "json")
    RSSHubOptions = defu<RSSHubOption, RSSHubOption[]>(RSSHubOptions, {
      sorted: true,
    })

    Object.entries(RSSHubOptions).forEach(([key, value]) => {
      url.searchParams.set(key, (value as any).toString())
    })
    const data: RSSHubResponse = await myFetch(url)
    return data.items.map(item => ({
      title: item.title,
      url: item.url,
      updated: item.date_published,
    }))
  })
}

type SourceGetterWithParams<P extends Record<string, Parameter>> = [
  P,
  (params: {
    [R in keyof P]: P[R] extends Parameter ? P[R]["default"] : never
  }) => Promise<NewsItem[]>,
]

export function defineSourceGetterWithParams<P extends Record<string, Parameter>>(...r: SourceGetterWithParams<P>) {
  return {
    params: r[0],
    getter: r[1],
  }
}
