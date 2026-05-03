import type { SourceLoader } from "../typings/sources"
import { myFetch } from "../utils/fetch"
import { $provider, $source } from "../utils/source"

interface Res {
  version: string
  title: string
  description: string
  home_page_url: string
  source_url: string
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

const share: SourceLoader = async () => {
  const res = await Promise.all(["create", "ideas", "programmer", "share"]
    .map(k => myFetch(`https://www.v2ex.com/feed/${k}.json`) as Promise<Res>))
  return res.map(k => k.items).flat().map(k => ({
    title: k.title,
    timestamp: new Date(k.date_modified ?? k.date_published).getTime(),
    url: k.url,
  })).sort((m, n) => m.timestamp < n.timestamp ? 1 : -1)
}

export default $provider({
  name: "V2EX",
  color: "slate",
  home: "https://v2ex.com/",
  sources: {
    default: $source({
      loader: share,
    }),
  },
})
