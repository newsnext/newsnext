import type { NewsItem } from "../typings/sources"
import { md5, myCrypto } from "../utils/crypto"
import { myFetch } from "../utils/fetch"
import { $provider, $source } from "../utils/source"

interface CLSItem {
  id: number
  title?: string
  brief: string
  ctime: number
  is_ad?: number
}

interface TelegraphResponse {
  data: {
    roll_data: CLSItem[]
  }
}

interface DepthResponse {
  data: {
    top_article: CLSItem[]
    depth_list: CLSItem[]
  }
}

interface HotResponse {
  data: CLSItem[]
}

const CLS_BASE_PARAMS = {
  appName: "CailianpressWeb",
  os: "web",
  sv: "7.7.5",
}

type SearchParamValue = string | number | boolean

async function getSearchParams(moreParams: Record<string, SearchParamValue> = {}): Promise<URLSearchParams> {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries({ ...CLS_BASE_PARAMS, ...moreParams })) {
    searchParams.set(key, String(value))
  }

  searchParams.sort()
  searchParams.append("sign", await md5(await myCrypto(searchParams.toString(), "SHA-1")))

  return searchParams
}

function toNewsItem(item: CLSItem): NewsItem {
  return {
    title: item.title || item.brief,
    timestamp: item.ctime * 1000,
    url: `https://www.cls.cn/detail/${item.id}`,
  }
}

export default $provider({
  title: "财联社",
  home: "https://www.cls.cn",
  color: "red",
  category: "finance",
  sources: [
    $source(
      {
        key: "default",
        title: "电报",
        type: "timeline",
        home: "https://www.cls.cn/telegraph",
      },
      async () => {
        const response = await myFetch<TelegraphResponse>("https://www.cls.cn/v1/roll/get_roll_list", {
          query: Object.fromEntries(await getSearchParams({
            last_time: Math.floor(Date.now() / 1000),
            refresh_type: 1,
            rn: 30,
          })),
          headers: {
            Referer: "https://www.cls.cn/telegraph",
          },
        })

        return response.data.roll_data
          .filter(item => !item.is_ad)
          .map(toNewsItem)
      },
    ),
    $source(
      {
        key: "depth",
        title: "深度",
        type: "timeline",
        home: "https://www.cls.cn/depth",
      },
      async () => {
        const response = await myFetch<DepthResponse>("https://www.cls.cn/v3/depth/home/assembled/1000", {
          query: Object.fromEntries(await getSearchParams()),
        })

        return [...response.data.depth_list]
          .sort((a, b) => b.ctime - a.ctime)
          .map(toNewsItem)
      },
    ),
    $source(
      {
        key: "hot",
        title: "热门",
        type: "hottest",
        home: "https://www.cls.cn",
      },
      async () => {
        const response = await myFetch<HotResponse>("https://www.cls.cn/v2/article/hot/list", {
          query: Object.fromEntries(await getSearchParams()),
        })

        return response.data.map(toNewsItem)
      },
    ),
  ],
})
