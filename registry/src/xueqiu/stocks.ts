import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import {
  fetchStockAnnouncements,
  fetchStockDiscussions,
  fetchStockNews,
} from "./stock-loader"

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
      type: "custom",
      load: fetchStockDiscussions,
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
      type: "custom",
      load: fetchStockNews,
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
      type: "custom",
      load: fetchStockAnnouncements,
    },
    capabilities: {
      network: ["api.xueqiu.com"],
    },
  },
} satisfies Record<string, ProviderSourceConfig>
