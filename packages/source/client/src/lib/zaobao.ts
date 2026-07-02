import { parseRelativeDate } from "@newsnext/source-shared/utils/date"
import { $provider, $source } from "@newsnext/source-shared/utils/source"

const base = "https://www.zaochenbao.com"

export default $provider({
  title: "联合早报",
  color: "red",
  home: "https://www.zaobao.com",
  sources: [
    $source.html(
      {
        key: "realtime",
        type: "timeline",
      },
      () => ({
        url: "https://www.zaochenbao.com/realtime/",
        decoding: "gb2312",
        items: "div.list-block>a.item",
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
      }),
    ),
  ],
})
