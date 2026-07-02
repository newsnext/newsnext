import { $provider, $source } from "@newsnext/source-shared/utils/source"

const baseurl = "https://s.weibo.com"
const flagUrls = {
  新: "https://simg.s.weibo.com/moter/flags/1_0.png",
  热: "https://simg.s.weibo.com/moter/flags/2_0.png",
  爆: "https://simg.s.weibo.com/moter/flags/4_0.png",
}

export default $provider({
  title: "微博",
  home: "https://s.weibo.com/top/summary?cate=realtimehot",
  color: "red",
  sources: [
    $source.html(
      {
        key: "hot-search",
        type: "hottest",
      },
      () => ({
        url: "https://s.weibo.com/top/summary?cate=realtimehot",
        items: $ => $("#pl_top_realtimehot table tbody tr:nth-child(n+2)").filter((_, el) => $(el).find(".ranktop").text() !== "•"),
        fields: {
          title: "td.td-02 a",
          url: {
            selector: "td.td-02 a",
            attr: "href",
            transform: href => `${baseurl}${href}`,
          },
          inline: {
            mark: {
              selector: "td.td-03",
              transform: (val) => {
                const flagUrl = flagUrls[val as keyof typeof flagUrls]
                if (!flagUrl) return undefined
                return { src: flagUrl, scale: 1.5 }
              },
            },
          },
        },
      }),
    ),
  ],
})
