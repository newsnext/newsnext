import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import type { SourceRadarRule } from "@newsnext/source-kit/types"
import { requestXueqiuJson } from "./shared"

const stockStatusTitle = {
  select: "title || description || text",
  transform: ["strip_html", { op: "replace", search: "网页链接", replacement: "" }, "normalize_whitespace", { op: "truncate", length: 120, suffix: "…" }],
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
    template: "/S/{{ scope.params.symbol }}",
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

function stockRadar(id: string, title: string): SourceRadarRule[] {
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
          transform: [{ op: "regex_extract", pattern: "^([^(]*)", group: 1 }, "normalize_whitespace"],
          template: `{{ scope.value }} | ${title}`,
        },
        home: "/S/{{ scope.params.symbol }}",
      },
    },
  }]
}

export const stockSources = {
  "stock-discussions": {
    version: 2,
    vars: {
      sortLabels: { hot: "热门讨论", latest: "最新讨论" },
      sortQuery: { hot: "alpha", latest: "time" },
      sortTypes: { hot: "ranking", latest: "" },
    },
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
            transform: [{ op: "regex_extract", pattern: "^([^(]*)", group: 1 }, "normalize_whitespace"],
            template: "{{ scope.value }} | {{ source.vars.sortLabels[scope.params.sort] }}",
          },
          home: "/S/{{ scope.params.symbol }}",
        },
      },
    }],
    loader: {
      type: "json",
      url: "https://api.xueqiu.com/query/v1/symbol/search/status.json?q=",
      query: { count: "20", comment: "0", symbol: "{{ scope.params.symbol }}", hl: "0", source: "user", sort: "{{ source.vars.sortQuery[scope.params.sort] }}", page: "1" },
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
            transform: ["strip_html", "normalize_whitespace"],
          },
          pictures: "firstImg",
        },
      },
      metadata: {
        ...stockHomeMetadata,
        type: {
          template: "{{ source.vars.sortTypes[scope.params.sort] }}",
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
      url: "https://api.xueqiu.com/statuses/stock_timeline.json",
      query: { symbol_id: "{{ scope.params.symbol }}", count: "20", source: "自选股新闻", page: "1" },
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
      url: "https://api.xueqiu.com/statuses/stock_timeline.json",
      query: { symbol_id: "{{ scope.params.symbol }}", count: "20", source: "公告", page: "1" },
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
