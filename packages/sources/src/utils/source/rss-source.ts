import type { RSSHubOption, RSSHubResponse } from "../../typings"
import defu from "defu"
import { createSourceFetcher } from "."
import { myFetch } from "../fetch"
import { rss2json } from "./rss2json"

export const defineRSSSourceFetcher = createSourceFetcher<{ url: string }>(async ({ url }) => {
  const data = await rss2json(url)
  if (!data?.items.length) throw new Error("Cannot fetch rss data")
  return data.items.map(item => ({
    title: item.title,
    url: item.link,
    updated: item.created,
  }))
})

export const defineRSSHubSourceFetcher = createSourceFetcher<{ route: string, host?: string, options?: RSSHubOption }>(async ({ route, host, options: RSSHubOptions }) => {
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
