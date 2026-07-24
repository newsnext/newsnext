import { md5, myCrypto } from "@newsnext/source/utils/crypto"
import { myFetch } from "@newsnext/source/utils/fetch"
import { $provider, $source } from "@newsnext/source/utils/source"

interface CLSItem {
  id: number
  title?: string
  brief: string
  shareurl: string
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

export default $provider({
  title: "财联社",
  home: "https://www.cls.cn",
  color: "red",
  category: "finance",
  sources: [
    $source({
      metadata: {
        key: "telegraph",
        title: "电报",
        type: "timeline",
      },
      loader: {
        type: "json",
        url: "https://www.cls.cn/v1/roll/get_roll_list",
        fetch: async (url) => {
          return myFetch<TelegraphResponse>(url, {
            query: Object.fromEntries(await getSearchParams({
              last_time: Math.floor(Date.now() / 1000),
              refresh_type: 1,
              rn: 30,
            })),
            headers: {
              Referer: "https://www.cls.cn/telegraph",
            },
          })
        },
        items: (response: TelegraphResponse) => response.data.roll_data.filter(item => !item.is_ad),
        fields: {
          title: item => item.title || item.brief,
          url: item => `https://www.cls.cn/detail/${item.id}`,
          mobileUrl: "shareurl",
          timestamp: item => item.ctime * 1000,
        },
      },
      capabilities: {
        network: ["www.cls.cn"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "1m" },
    }),
    $source({
      metadata: {
        key: "depth",
        title: "深度",
        type: "timeline",
        home: "https://www.cls.cn/depth",
      },
      loader: {
        type: "json",
        url: "https://www.cls.cn/v3/depth/home/assembled/1000",
        fetch: async (url) => {
          return myFetch<DepthResponse>(url, {
            query: Object.fromEntries(await getSearchParams()),
          })
        },
        items: (response: DepthResponse) => [...response.data.depth_list]
          .sort((left, right) => right.ctime - left.ctime),
        fields: {
          title: item => item.title || item.brief,
          url: item => `https://www.cls.cn/detail/${item.id}`,
          mobileUrl: "shareurl",
          timestamp: item => item.ctime * 1000,
        },
      },
      capabilities: {
        network: ["www.cls.cn"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "5m" },
    }),
    $source({
      metadata: {
        key: "hot-article",
        title: "热门",
        type: "hottest",
      },
      loader: {
        type: "json",
        url: "https://www.cls.cn/v2/article/hot/list",
        fetch: async (url) => {
          return myFetch<HotResponse>(url, {
            query: Object.fromEntries(await getSearchParams()),
          })
        },
        items: (response: HotResponse) => response.data,
        fields: {
          title: item => item.title || item.brief,
          url: item => `https://www.cls.cn/detail/${item.id}`,
          mobileUrl: "shareurl",
          timestamp: item => item.ctime * 1000,
        },
      },
      capabilities: {
        network: ["www.cls.cn"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "5m" },
    }),
  ],
})
