import type { RSSHubOption, RSSHubResponse } from "../typings"
import type { InitalSource, NewsItem, Parameter, SourceGetter, SourceWithoutNamespaceKey } from "../typings/sources"
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
    _[source.id ?? "default"] = _default
  }
  return _
}

export function defineRSSSourceGetter(url: string): SourceGetter {
  return async () => {
    const data = await rss2json(url)
    if (!data?.items.length) throw new Error("Cannot fetch rss data")
    return data.items.map(item => ({
      title: item.title,
      url: item.link,
      updated: item.created,
    }))
  }
}

export function defineRSSHubSourceGetter(route: string, host = "https://rsshub.rssforever.com", RSSHubOptions?: RSSHubOption): SourceGetter {
  return async () => {
    // "https://rsshub.pseudoyu.com"
    const RSSHubBase = host
    const url = new URL(route, RSSHubBase)
    url.searchParams.set("format", "json")
    RSSHubOptions = defu<RSSHubOption, RSSHubOption[]>(RSSHubOptions, {
      sorted: true,
    })

    Object.entries(RSSHubOptions).forEach(([key, value]) => {
      url.searchParams.set(key, value.toString())
    })
    const data: RSSHubResponse = await myFetch(url)
    return data.items.map(item => ({
      title: item.title,
      url: item.url,
      updated: item.date_published,
    }))
  }
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
