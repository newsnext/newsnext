import type { ProviderConfig } from "@newsnext/source/registry"
import { md5, myCrypto } from "@newsnext/source/utils"

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
  category: "finance",
  color: "red",
  defaults: {
    baseUrl: "https://www.cls.cn/",
    cache: "5m",
    loader: {
      type: "json",
      fields: {
        title: "title || brief",
        url: {
          select: "id",
          template: "/detail/{{ scope.value | url_path }}",
        },
        mobileUrl: "shareurl",
        timestamp: {
          select: "ctime",
          template: "{{ scope.value | times: 1000 }}",
        },
      },
    },
    metadata: {
      home: "/",
    },
  },
  sources: {
    "telegraph": {
      metadata: {
        title: "电报",
      },
      loader: {
        url: "/v1/roll/get_roll_list",
        request: async ({ url, fetch }) => {
          return fetch.get(url, {
            headers: {
              Referer: "https://www.cls.cn/telegraph",
            },
            searchParams: await getSearchParams({
              last_time: Math.floor(Date.now() / 1000),
              refresh_type: 1,
              rn: 30,
            }),
          })
        },
        items: "data.roll_data[?is_ad != `1`]",
      },
      cache: "1m",
    },
    "depth": {
      metadata: {
        title: "深度",
        home: "/depth",
      },
      loader: {
        url: "/v3/depth/home/assembled/1000",
        request: async ({ url, fetch }) => {
          return fetch.get(url, {
            searchParams: await getSearchParams(),
          })
        },
        items: "reverse(sort_by(data.depth_list, &ctime))",
      },
    },
    "hot-article": {
      metadata: {
        title: "热门",
      },
      loader: {
        url: "/v2/article/hot/list",
        request: async ({ url, fetch }) => {
          return fetch.get(url, {
            searchParams: await getSearchParams(),
          })
        },
        items: "data",
      },
    },
  },
} satisfies ProviderConfig
