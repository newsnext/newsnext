import type { ProviderConfig } from "@newsnext/source/utils/source"

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
        items: "data.items[?!ad]",
        fields: {
          url: {
            select: "code",
            template: "https://xueqiu.com/s/{{ value | url_path }}",
          },
          title: "name",
          inline: {
            html: {
              template: "<span style=\"color: {% if item.percent > 0 %}#ef4444{% else %}#22c55e{% endif %}\">{{ item.percent }}%</span> <span>{{ item.exchange }}</span>",
            },
          },
        },
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
