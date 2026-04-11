import type { RSSHubOption, RSSHubResponse } from "../../typings"
import defu from "defu"
import { createFeedLoader } from "."
import { myFetch } from "../fetch"
import { rss2json } from "./rss2json"

export const $rssFeedLoader = createFeedLoader<{ url: string }>(async ({ url }) => {
  const data = await rss2json(url)
  if (!data?.items.length) throw new Error("Cannot fetch rss data")
  return data.items.map(item => ({
    title: item.title,
    url: item.link,
    timestamp: item.created ? new Date(item.created).getTime() : undefined,
  }))
})

export const $rssHubFeedLoader = createFeedLoader<{ route: string, host?: string, options?: RSSHubOption }>(async ({ route, host, options: RSSHubOptions }) => {
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
  const data: RSSHubResponse = await myFetch(url.toString(), {
    timeout: 5000,
  })
  return data.items.map(item => ({
    title: item.title,
    url: item.url,
    timestamp: new Date(item.date_published).getTime(),
  }))
})
