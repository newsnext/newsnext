import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import type { NewsItem } from "@newsnext/source-kit/types"
import { requestXueqiuJson } from "./shared"

export function formatXueqiuPriceAnnotation(item: Readonly<NewsItem>, includeExchange = false): string {
  const { changePercent, current, exchange } = item.attributes ?? {}
  const percent = changePercent === undefined ? "--" : `${changePercent}%`
  const price = current || current === 0 ? current : "--"
  return [percent, price, includeExchange ? exchange : undefined].filter(value => value !== undefined && value !== "").join(" · ")
}

const hotStockTitleTemplate = "热股榜 | {{ source.vars.marketTitle[scope.params.market] }}"
const marketMoversTitleTemplate = "{{ source.vars.directionTitle[scope.params.direction] }} | {{ source.vars.marketTitle[scope.params.market] }}"

const marketParams = {
  market: {
    type: "select",
    title: "市场",
    values: [
      { label: "沪深", value: "cn" },
      { label: "港股", value: "hk" },
      { label: "美股", value: "us" },
    ],
    default: "cn",
  },
} as const

export const marketSources = {
  "hot-stock": {
    version: 7,
    metadata: {
      title: "热股榜",
      home: "/hq#hot",
      type: "ranking",
    },
    vars: {
      marketTitle: {
        global: "全球",
        cn: "沪深",
        hk: "港股",
        us: "美股",
      },
      marketType: {
        global: 10,
        cn: 12,
        hk: 13,
        us: 11,
      },
      rankingType: {
        hour: {
          global: 10,
          cn: 12,
          hk: 13,
          us: 11,
        },
        day: {
          global: 20,
          cn: 22,
          hk: 23,
          us: 21,
        },
      },
    },
    params: {
      market: {
        type: "select",
        title: "市场",
        values: [
          { label: "全球", value: "global" },
          { label: "沪深", value: "cn" },
          { label: "港股", value: "hk" },
          { label: "美股", value: "us" },
        ],
        default: "global",
      },
      period: {
        type: "select",
        title: "时间范围",
        values: [
          { label: "1 小时", value: "hour" },
          { label: "24 小时", value: "day" },
        ],
        default: "hour",
      },
    },
    radar: [{
      id: "xueqiu-hot-stock",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
      patch: {
        params: {
          market: () => {
            const page = globalThis as unknown as {
              document: {
                querySelectorAll: (selector: string) => ArrayLike<{
                  classList: { contains: (className: string) => boolean }
                }>
              }
            }
            const controls = Array.from(page.document.querySelectorAll(
              ".stock-hot__container:has(> h3 a[href=\"/hq#hot\"]) > .tabs__panel a",
            ))
            const activeIndex = controls.findIndex(
              control => control.classList.contains("active"),
            )
            return (["global", "cn", "hk", "us"] as const)[activeIndex] ?? "global"
          },
          period: () => {
            const page = globalThis as unknown as {
              document: {
                querySelectorAll: (selector: string) => ArrayLike<{
                  classList: { contains: (className: string) => boolean }
                }>
              }
            }
            const controls = Array.from(page.document.querySelectorAll(
              ".stock-hot__container:has(> h3 a[href=\"/hq#hot\"]) > .stock-hot__time a",
            ))
            const activeIndex = controls.findIndex(
              control => control.classList.contains("active"),
            )
            return (["hour", "day"] as const)[activeIndex] ?? "hour"
          },
        },
        metadata: {
          title: hotStockTitleTemplate,
        },
      },
    }],
    loader: {
      type: "json",
      url: "https://stock.xueqiu.com/v5/stock/hot_stock/list.json",
      query: { size: "30", _type: "{{ source.vars.marketType[scope.params.market] }}", type: "{{ source.vars.rankingType[scope.params.period][scope.params.market] }}" },
      request: requestXueqiuJson,
      items: "data.items[?ad == `0` || ad == `null`]",
      fields: {
        url: {
          select: "code",
          template: "/S/{{ scope.value }}",
        },
        title: "name",
        attributes: {
          exchange: "exchange",
          current: "current",
          change: "chg",
          changePercent: "percent",
        },
      },
      metadata: {
        title: {
          template: hotStockTitleTemplate,
        },
      },
      annotation: item => formatXueqiuPriceAnnotation(item, true),
    },
    capabilities: {
      network: ["xueqiu.com"],
    },
  },
  "market-movers": {
    version: 4,
    metadata: {
      title: "涨跌幅榜",
      home: "/hq",
      type: "ranking",
    },
    vars: {
      directionTitle: {
        gainers: "涨幅榜",
        losers: "跌幅榜",
      },
      marketTitle: {
        cn: "沪深",
        hk: "港股",
        us: "美股",
      },
      marketType: {
        cn: "sh_sz_bj",
        hk: "hk",
        us: "us",
      },
      directionOrder: {
        gainers: "desc",
        losers: "asc",
      },
    },
    params: {
      ...marketParams,
      direction: {
        type: "select",
        title: "方向",
        values: [
          { label: "涨幅榜", value: "gainers" },
          { label: "跌幅榜", value: "losers" },
        ],
        default: "gainers",
      },
    },
    radar: [{
      id: "xueqiu-market-movers",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
      patch: {
        params: {
          market: () => {
            const page = globalThis as unknown as {
              document: {
                querySelectorAll: (selector: string) => ArrayLike<{
                  classList: { contains: (className: string) => boolean }
                }>
              }
            }
            const controls = Array.from(page.document.querySelectorAll(
              ".stock-hot__container:has(> h3 a[href=\"/hq#rank\"]) > .tabs__panel a",
            ))
            const activeIndex = controls.findIndex(
              control => control.classList.contains("active"),
            )
            return (["cn", "hk", "us"] as const)[activeIndex] ?? "cn"
          },
          direction: () => {
            const page = globalThis as unknown as {
              document: {
                querySelectorAll: (selector: string) => ArrayLike<{
                  classList: { contains: (className: string) => boolean }
                }>
              }
            }
            const controls = Array.from(page.document.querySelectorAll(
              ".stock-hot__container:has(> h3 a[href=\"/hq#rank\"]) > .stock-hot__time a",
            ))
            const activeIndex = controls.findIndex(
              control => control.classList.contains("active"),
            )
            return (["gainers", "losers"] as const)[activeIndex] ?? "gainers"
          },
        },
        metadata: {
          title: marketMoversTitleTemplate,
        },
      },
    }],
    loader: {
      type: "json",
      url: "https://stock.xueqiu.com/v5/stock/screener/quote/list.json",
      query: { page: "1", size: "30", type: "{{ source.vars.marketType[scope.params.market] }}", order_by: "percent", order: "{{ source.vars.directionOrder[scope.params.direction] }}" },
      request: requestXueqiuJson,
      items: "data.list",
      fields: {
        url: {
          select: "symbol",
          template: "/S/{{ scope.value }}",
        },
        title: "name",
        attributes: {
          current: "current",
          change: "chg",
          changePercent: "percent",
          turnoverRate: "turnover_rate",
          marketCapital: "market_capital",
        },
      },
      metadata: {
        title: {
          template: marketMoversTitleTemplate,
        },
      },
      annotation: formatXueqiuPriceAnnotation,
    },
    capabilities: {
      network: ["xueqiu.com"],
    },
  },
} satisfies Record<string, ProviderSourceConfig>
