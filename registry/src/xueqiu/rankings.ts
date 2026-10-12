import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import type { NewsItem } from "@newsnext/source-kit/types"

export function formatXueqiuFundAnnotation(item: Readonly<NewsItem>): string | undefined {
  const { returnRate, returnPeriod } = item.attributes ?? {}
  if (returnRate === undefined || returnRate === null || returnRate === "") return undefined
  const rate = Number(returnRate)
  if (!Number.isFinite(rate)) return undefined
  return [returnPeriod, `${Math.round(rate * 10_000) / 100}%`].filter(value => value !== undefined && value !== "").join(" · ")
}

export const rankingSources = {
  "hot-topic": {
    metadata: {
      title: "热门话题",
      home: "/",
      type: "ranking",
    },
    loader: {
      type: "json",
      url: "/hot_event/list.json",
      query: { count: "10" },
      items: "list",
      fields: {
        url: {
          select: "tag",
          template: "/k?q={{ scope.value | url_query }}",
        },
        title: {
          select: "tag",
          transform: { op: "replace", search: "#", replacement: "" },
        },
        content: {
          pictures: "pic",
        },
      },
    },
    radar: [{
      id: "xueqiu-hot-topic",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
    }],
  },
  "hot-fund": {
    version: 2,
    metadata: {
      title: "热门基金",
      home: "/",
      type: "ranking",
    },
    loader: {
      type: "json",
      url: "/snb/dj/fundx/activity/x/web/searchFund",
      query: { fund_type: "0", business_code: "20" },
      items: "data.public_fund",
      fields: {
        url: {
          select: "fund_code",
          template: "/S/{{ scope.value }}",
        },
        title: "fund_name",
        attributes: {
          returnPeriod: "profit_desc",
          returnRate: "profit_rate",
        },
      },
      annotation: formatXueqiuFundAnnotation,
    },
    radar: [{
      id: "xueqiu-hot-fund",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
    }],
  },
} satisfies Record<string, ProviderSourceConfig>
