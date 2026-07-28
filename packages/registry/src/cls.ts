import type { ProviderConfig } from "@newsnext/source/registry"
import { md5, myCrypto, myFetch } from "@newsnext/source/utils"

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

export default {
  title: "财联社",
  defaults: {
    cache: "5m",
    loader: {
      type: "json",
      fields: {
        title: "title || brief",
        url: {
          select: "id",
          template: "https://www.cls.cn/detail/{{ scope.value | url_path }}",
        },
        mobileUrl: "shareurl",
        timestamp: {
          select: "ctime",
          template: "{{ scope.value | times: 1000 }}",
        },
      },
    },
    metadata: {
      home: "https://www.cls.cn",
      color: "red",
      category: "finance",
      type: "timeline",
    },
  },
  sources: {
    "telegraph": {
      metadata: {
        title: "电报",
      },
      loader: {
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
        items: "data.roll_data[?!is_ad]",
      },
      cache: "1m",
    },
    "depth": {
      metadata: {
        title: "深度",
        home: "https://www.cls.cn/depth",
      },
      loader: {
        url: "https://www.cls.cn/v3/depth/home/assembled/1000",
        fetch: async (url) => {
          return myFetch<DepthResponse>(url, {
            query: Object.fromEntries(await getSearchParams()),
          })
        },
        items: "reverse(sort_by(data.depth_list, &ctime))",
      },
    },
    "hot-article": {
      metadata: {
        title: "热门",
        type: "hottest",
      },
      loader: {
        url: "https://www.cls.cn/v2/article/hot/list",
        fetch: async (url) => {
          return myFetch<HotResponse>(url, {
            query: Object.fromEntries(await getSearchParams()),
          })
        },
        items: "data",
      },
    },
  },
} satisfies ProviderConfig
