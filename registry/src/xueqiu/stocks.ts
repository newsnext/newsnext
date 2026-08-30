import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import { requestXueqiuJson } from "./shared"

const stockStatusTitle = {
  select: "title || description || text",
  template: "{{ scope.value | strip_html | remove: \"网页链接\" | normalize_whitespace | truncate: 120, \"…\" }}",
} as const

const stockTimelineFields = {
  url: "target",
  title: stockStatusTitle,
  publishedAt: "created_at",
  content: {
    html: "description",
    pictures: "firstImg",
  },
} as const

const stockHomeMetadata = {
  home: {
    template: "/S/{{ scope.params.symbol | url_path }}",
  },
} as const

const stockParam = {
  type: "text",
  title: "股票代码",
  default: "SH600519",
  required: true,
  validate: {
    regex: "^[A-Za-z0-9.-]{1,24}$",
  },
} as const

function stockRadar(id: string, title: string) {
  return [{
    id,
    match: {
      hosts: ["xueqiu.com"],
      paths: ["/S/:symbol"],
    },
    patch: {
      params: {
        symbol: "{{ scope.path.symbol }}",
      },
      metadata: {
        title: {
          select: "title",
          template: `{{ scope.value | split: "(" | first | normalize_whitespace }} | ${title}`,
        },
        home: "/S/{{ scope.params.symbol | url_path }}",
      },
    },
  }]
}

export const stockSources = {
  "stock-discussions": {
    metadata: {
      title: "股票讨论",
    },
    params: {
      symbol: stockParam,
      sort: {
        type: "select",
        title: "排序",
        values: [
          { label: "最新", value: "latest" },
          { label: "热门", value: "hot" },
        ],
        default: "latest",
      },
    },
    radar: [{
      id: "xueqiu-stock-discussions",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/S/:symbol"],
      },
      patch: {
        params: {
          symbol: "{{ scope.path.symbol }}",
          sort: () => {
            const page = globalThis as unknown as {
              document: {
                querySelectorAll: (selector: string) => ArrayLike<{
                  classList: { contains: (className: string) => boolean }
                }>
              }
            }
            const controls = Array.from(page.document.querySelectorAll(".sort-types a"))
            const activeIndex = controls.findIndex(
              control => control.classList.contains("active"),
            )
            return (["latest", "hot"] as const)[activeIndex] ?? "latest"
          },
        },
        metadata: {
          title: {
            select: "title",
            template: "{{ scope.value | split: \"(\" | first | normalize_whitespace }} | {% if scope.params.sort == \"hot\" %}热门讨论{% else %}最新讨论{% endif %}",
          },
          home: "/S/{{ scope.params.symbol | url_path }}",
        },
      },
    }],
    loader: {
      type: "json",
      url: "https://api.xueqiu.com/query/v1/symbol/search/status.json?count=20&comment=0&symbol={{ scope.params.symbol | url_query }}&hl=0&source=user&sort={% if scope.params.sort == \"hot\" %}alpha{% else %}time{% endif %}&page=1&q=",
      request: requestXueqiuJson,
      items: "list",
      fields: {
        ...stockTimelineFields,
        author: {
          name: "user.screen_name",
          home: "user.profile",
        },
        stats: {
          likes: "like_count",
          comments: "reply_count",
          reposts: "retweet_count",
          views: "view_count",
        },
        content: {
          text: {
            select: "description || text",
            template: "{{ scope.value | strip_html | normalize_whitespace }}",
          },
          pictures: "firstImg",
        },
      },
      metadata: {
        ...stockHomeMetadata,
        type: {
          template: "{% if scope.params.sort == \"hot\" %}ranking{% endif %}",
        },
      },
    },
    capabilities: {
      network: ["api.xueqiu.com"],
    },
  },
  "stock-news": {
    metadata: {
      title: "股票资讯",
    },
    params: {
      symbol: stockParam,
    },
    radar: stockRadar("xueqiu-stock-news", "资讯"),
    loader: {
      type: "json",
      url: "https://api.xueqiu.com/statuses/stock_timeline.json?symbol_id={{ scope.params.symbol | url_query }}&count=20&source={{ \"自选股新闻\" | url_query }}&page=1",
      request: requestXueqiuJson,
      items: "list",
      fields: stockTimelineFields,
      metadata: stockHomeMetadata,
    },
    capabilities: {
      network: ["api.xueqiu.com"],
    },
  },
  "stock-announcements": {
    metadata: {
      title: "股票公告",
    },
    params: {
      symbol: stockParam,
    },
    radar: stockRadar("xueqiu-stock-announcements", "公告"),
    loader: {
      type: "json",
      url: "https://api.xueqiu.com/statuses/stock_timeline.json?symbol_id={{ scope.params.symbol | url_query }}&count=20&source={{ \"公告\" | url_query }}&page=1",
      request: requestXueqiuJson,
      items: "list",
      fields: stockTimelineFields,
      metadata: stockHomeMetadata,
    },
    capabilities: {
      network: ["api.xueqiu.com"],
    },
  },
} satisfies Record<string, ProviderSourceConfig>
