import { load } from "cheerio/slim"
import { myFetch } from "@/utils/fetch"
import { $provider, $source } from "@/utils/source"
import { genHeaders } from "./utils"

interface CoolApkItem {
  id: string
  editor_title?: string
  message: string
  pic?: string
  url: string
  userAvatar: string
  targetRow?: {
    subTitle: string
  }
}

export default $provider({
  title: "CoolAPK",
  color: "green",
  home: "https://coolapk.com",
  sources: [
    $source.json(
      {
        name: "default",
        type: "hottest",
        title: "Today",
      },
      () => ({
        url: "https://api.coolapk.com/v6/page/dataList?url=%2Ffeed%2FstatList%3FcacheExpires%3D300%26statType%3Dday%26sortField%3Ddetailnum%26title%3D%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&title=%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&subTitle=&page=1",
        fetch: async (url) => {
          const headers = await genHeaders()
          return myFetch(url, { headers })
        },
        items: json => json.data.filter((k: CoolApkItem) => k.id),
        fields: {
          title: (item: CoolApkItem) => {
            const title = item.editor_title || load(item.message).text().split("\n")[0]
            return title.length > 50 ? `${title.slice(0, 50)}...` : title
          },
          url: item => `https://www.coolapk.com${item.url}`,
          inline: {
            text: "targetRow.subTitle",
            icon: item => item.userAvatar,
          },
          preview: {
            text: item => item.message ? load(item.message).text() : "",
            picture: item => item.pic,
          },
        },
      }),
    ),
  ],
})
