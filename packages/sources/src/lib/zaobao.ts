import { Time } from "../typings/constants"
import { parseRelativeDate } from "../utils/date"
import { defineHtmlSourceGetter } from "../utils/html-source"
import { defineSource } from "../utils/source"

const base = "https://www.zaochenbao.com"

export default defineSource({
  name: "联合早报",
  interval: Time.Common,
  type: "timeline",
  category: "world",
  color: "red",
  home: "https://www.zaobao.com",
  id: "news",
  ...defineHtmlSourceGetter(() => ({
    url: "https://www.zaochenbao.com/realtime/",
    decoding: "gb2312",
    itemSelector: "div.list-block>a.item",
    fields: {
      title: ".eps",
      url: {
        attr: "href",
        transform: val => base + val,
      },
      updated: {
        selector: ".pdt10",
        transform: (val) => {
          if (!val) return undefined
          const dateStr = val.replace(/-\s/g, " ")
          return parseRelativeDate(dateStr, "Asia/Shanghai").getTime()
        },
      },
    },
  })),
})
