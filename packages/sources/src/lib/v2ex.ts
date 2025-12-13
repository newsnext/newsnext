import type { SourceGetter } from "../typings/sources"
import { myFetch } from "../utils/fetch"
import { defineSource } from "../utils/source"

interface Res {
  version: string
  title: string
  description: string
  home_page_url: string
  feed_url: string
  icon: string
  favicon: string
  items: {
    url: string
    date_modified?: string
    content_html: string
    date_published: string
    title: string
    id: string
  }[]
}

const share: SourceGetter = async () => {
  const res = await Promise.all(["create", "ideas", "programmer", "share"]
    .map(k => myFetch(`https://www.v2ex.com/feed/${k}.json`) as Promise<Res>))
  return res.map(k => k.items).flat().map(k => ({
    title: k.title,
    updated: new Date(k.date_modified ?? k.date_published).getTime(),
    url: k.url,
  })).sort((m, n) => m.updated < n.updated ? 1 : -1)
}

export default defineSource({
  name: "V2EX",
  color: "slate",
  home: "https://v2ex.com/",
  sub: [
    {
      id: "share",
      title: "Share",
      category: "tech",
      getter: share,
    },
  ],
})
