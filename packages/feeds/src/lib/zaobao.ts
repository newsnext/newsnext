import { Time } from "../typings/constants"
import { parseRelativeDate } from "../utils/date"
import { $feed, $htmlFeedLoader, $provider } from "../utils/feed"

const base = "https://www.zaochenbao.com"

export default $provider({
  name: "联合早报",
  category: "world",
  color: "red",
  home: "https://www.zaobao.com",
  feeds: {
    default: $feed({
      interval: Time.Common,
      type: "timeline",
      ...$htmlFeedLoader(() => ({
        url: "https://www.zaochenbao.com/realtime/",
        decoding: "gb2312",
        itemSelector: "div.list-block>a.item",
        fields: {
          title: ".eps",
          url: {
            attr: "href",
            transform: val => base + val,
          },
          timestamp: {
            selector: ".pdt10",
            transform: (val) => {
              if (!val) return undefined
              const dateStr = val.replace(/-\s/g, " ")
              return parseRelativeDate(dateStr, "Asia/Shanghai").getTime()
            },
          },
        },
      })),
    }),
  },
})
