import { Time } from "../typings/constants"
import { defineJsonSourceFetcher, defineSource } from "../utils/source"

function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}w`
  }
  return num.toString()
}

interface HotSearchItem {
  keyword: string
  show_name: string
  icon: string
}

interface VideoItem {
  bvid: string
  title: string
  pubdate: number
  owner: { name: string, face: string }
  stat: { view: number, like: number }
  desc: string
  pic: string
}

const hotSearch = defineJsonSourceFetcher<HotSearchItem>(() => ({
  url: "https://s.search.bilibili.com/main/hotword?limit=30",
  items: "list",
  fields: {
    title: "show_name",
    url: ({ keyword }) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`,
    meta: {
      mark: item => item.icon,
    },
  },
}))

const hotVideo = defineJsonSourceFetcher<VideoItem>(() => ({
  url: "https://api.bilibili.com/x/web-interface/popular",
  items: "data.list",
  fields: {
    title: "title",
    url: ({ bvid }) => `https://www.bilibili.com/video/${bvid}`,
    timestamp: ({ pubdate }) => pubdate * 1000,
    meta: {
      text: ({ stat }) => `${formatNumber(stat.view)}观看 · ${formatNumber(stat.like)}点赞`,
      icon: item => item.owner.face,
    },
    detail: {
      text: "desc",
      picture: item => item.pic,
    },
  },
}))

const ranking = defineJsonSourceFetcher<VideoItem>(() => ({
  url: "https://api.bilibili.com/x/web-interface/ranking/v2",
  items: "data.list",
  fields: {
    title: "title",
    url: ({ bvid }) => `https://www.bilibili.com/video/${bvid}`,
    timestamp: ({ pubdate }) => pubdate * 1000,
    meta: {
      text: ({ stat }) => `${formatNumber(stat.view)}观看 · ${formatNumber(stat.like)}点赞`,
      icon: item => item.owner.face ? { url: item.owner.face, radius: 4 } : undefined,
    },
    detail: {
      text: "desc",
      picture: item => item.pic,
    },
  },
}))

export default defineSource({
  name: "Bilibili",
  home: "https://www.bilibili.com",
  color: "blue",
  category: "china",
  sub: [
    {
      id: "default",
      title: "热搜",
      type: "hottest",
      interval: Time.Realtime,
      ...hotSearch,
    },
    {
      id: "hot-video",
      title: "热门视频",
      type: "hottest",
      interval: Time.Common,
      ...hotVideo,
    },
    {
      id: "ranking",
      title: "排行榜",
      interval: Time.Common,
      type: "hottest",
      ...ranking,
    },
  ],
})
