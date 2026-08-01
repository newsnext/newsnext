import type { ProviderConfig } from "@newsnext/source/registry"

const XUEQIU_ORIGIN = "https://xueqiu.com"
const XUEQIU_SESSION_ERROR_CODE = "400016"

interface XueqiuErrorResponse {
  error_code?: string
}

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
      loader: {
        type: "json",
        url: "https://stock.xueqiu.com/v5/stock/hot_stock/list.json?size=30&_type=10&type=10",
        request: ({ url, fetch, signal }) => {
          const xueqiuFetch = fetch.extend({
            hooks: {
              afterResponse: [async ({ request, response, retryCount }) => {
                if (response.status !== 400 || retryCount > 0) return

                let error: XueqiuErrorResponse
                try {
                  error = await response.json<XueqiuErrorResponse>()
                } catch {
                  signal?.throwIfAborted()
                  return
                }
                if (error.error_code !== XUEQIU_SESSION_ERROR_CODE) return

                try {
                  await fetch.get(`${XUEQIU_ORIGIN}/hq`)
                } catch {
                  signal?.throwIfAborted()
                  return
                }

                return fetch.retry({
                  code: "XUEQIU_SESSION_BOOTSTRAPPED",
                  request,
                })
              }],
            },
          })

          return xueqiuFetch.get(url)
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
