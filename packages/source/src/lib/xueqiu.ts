import type { ProviderConfig } from "@newsnext/source/utils/source"

interface StockItem {
  code: string
  name: string
  percent: number
  exchange: string
  ad: number
}

export default {
  title: "雪球",
  home: "https://xueqiu.com",
  color: "blue",
  sources: {
    "hot-stock": {
      type: "hottest",
      loader: {
        type: "json",
        url: "https://stock.xueqiu.com/v5/stock/hot_stock/list.json?size=30&_type=10&type=10",
        items: json => json.data.items.filter((k: StockItem) => !k.ad),
        fields: {
          url: (item: StockItem) => `https://xueqiu.com/s/${item.code}`,
          title: "name",
          inline: {
            html: (item: StockItem) => `<span style="color: ${item.percent > 0 ? "#ef4444" : "#22c55e"}">${item.percent}%</span> <span>${item.exchange}</span>`,
          },
        },
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
