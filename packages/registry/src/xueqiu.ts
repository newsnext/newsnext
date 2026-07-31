import type { ProviderConfig } from "@newsnext/source/registry"
import { myFetch } from "@newsnext/source/utils"

const XUEQIU_ORIGIN = "https://xueqiu.com"

export default {
  title: "雪球",
  category: "finance",
  color: "blue",
  defaults: {
    baseUrl: `${XUEQIU_ORIGIN}/`,
    metadata: {
      home: "/",
    },
  },
  sources: {
    "hot-stock": {
      metadata: {
        type: "hottest",
      },
      loader: {
        type: "json",
        url: "https://stock.xueqiu.com/v5/stock/hot_stock/list.json?size=30&_type=10&type=10",
        fetch: async (url) => {
          await myFetch.raw(`${XUEQIU_ORIGIN}/hq`)
          return myFetch(url)
        },
        items: "data.items[?ad == `0` || ad == `null`]",
        fields: {
          url: {
            select: "code",
            template: "/s/{{ scope.value | url_path }}",
          },
          title: "name",
          inline: {
            html: {
              template: "<span style=\"color: {% if scope.item.percent == nil %}#64748b{% elsif scope.item.percent > 0 %}#ef4444{% else %}#22c55e{% endif %}\">{% if scope.item.percent == nil %}--{% else %}{{ scope.item.percent }}%{% endif %}</span> <span>{{ scope.item.exchange }}</span>",
            },
          },
        },
      },
      capabilities: {
        network: ["xueqiu.com"],
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
