import { $fetch } from "ofetch"
import { myFetch } from "../utils/fetch"
import { $jsonLoader, $provider, $source } from "../utils/source"

interface StockItem {
  code: string
  name: string
  percent: number
  exchange: string
  ad: number
}

export default $provider({
  name: "雪球",
  home: "https://xueqiu.com",
  color: "blue",
  category: "finance",
  sources: {
    default: $source({
      type: "hottest",
      ...$jsonLoader<StockItem>(() => ({
        url: "https://stock.xueqiu.com/v5/stock/hot_stock/list.json?size=30&_type=10&type=10",
        fetch: async (url) => {
          // Need to get cookie first
          const cookieResponse = await $fetch.raw("https://xueqiu.com/hq")
          const cookies = cookieResponse.headers.getSetCookie()

          return myFetch(url, {
            headers: {
              cookie: cookies.join("; "),
            },
          })
        },
        items: json => json.data.items.filter((k: any) => !k.ad),
        fields: {
          url: item => `https://xueqiu.com/s/${item.code}`,
          title: "name",
          meta: {
            html: item => `<span style="color: ${item.percent > 0 ? "#ef4444" : "#22c55e"}">${item.percent}%</span> <span>${item.exchange}</span>`,
          },
        },
      })),
    }),
  },
})
