import { load } from "cheerio"
import { myFetch } from "../../utils/fetch"
import { defineSource } from "../../utils/source"
import { genHeaders } from "./utils"

interface Res {
  data: {
    id: string
    // 多行
    message: string
    // 起的标题
    editor_title: string
    shareUrl: string
    entityType: string
    pubDate: string
    // dayjs(dateline, 'X')
    dateline: number
    targetRow: {
      // 374.4万热度
      subTitle: string
    }
  }[]
}

export default defineSource({
  name: "CoolAPK",
  type: "hottest",
  category: "tech",
  id: "hot-today",
  color: "green",
  title: "Today",
  home: "https://coolapk.com",
  getter: async () => {
    const url = "https://api.coolapk.com/v6/page/dataList?url=%2Ffeed%2FstatList%3FcacheExpires%3D300%26statType%3Dday%26sortField%3Ddetailnum%26title%3D%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&title=%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&subTitle=&page=1"
    const r: Res = await myFetch(url, {
      headers: await genHeaders(),
    })
    if (!r.data.length) throw new Error("Failed to fetch")
    return r.data.filter(k => k.id).map(i => ({
      id: i.id,
      title: i.editor_title || load(i.message).text().split("\n")[0],
      url: i.shareUrl,
      extra: {
        info: i.targetRow?.subTitle,
        // date: new Date(i.dateline * 1000).getTime(),
      },
    }))
  },
})
