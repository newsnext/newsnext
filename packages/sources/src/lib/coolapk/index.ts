import { myFetch } from "../../utils/fetch"
import { defineJsonSourceFetcher, defineSource } from "../../utils/source"
import { genHeaders } from "./utils"

interface CoolApkItem {
  id: string
  editor_title?: string
  message: string
  url: string
  targetRow?: {
    subTitle: string
  }
}

export default defineSource({
  name: "CoolAPK",
  type: "hottest",
  category: "tech",
  color: "green",
  title: "Today",
  home: "https://coolapk.com",
  ...defineJsonSourceFetcher<CoolApkItem>(() => ({
    url: "https://api.coolapk.com/v6/page/dataList?url=%2Ffeed%2FstatList%3FcacheExpires%3D300%26statType%3Dday%26sortField%3Ddetailnum%26title%3D%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&title=%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&subTitle=&page=1",
    fetch: async (url) => {
      const headers = await genHeaders()
      return myFetch(url, { headers })
    },
    items: json => json.data.filter((k: any) => k.id),
    fields: {
      title: item => item.editor_title || item.message.split("\n")[0],
      url: item => `https://www.coolapk.com${item.url}`,
      extra: {
        info: "targetRow.subTitle",
      },
    },
  })),
})
