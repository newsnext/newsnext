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
  owner: { name: string }
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
    extra: {
      icon: item => item.icon ? { url: item.icon, scale: 1 } : undefined,
    },
  },
}))

const hotVideo = defineJsonSourceFetcher<VideoItem>(() => ({
  url: "https://api.bilibili.com/x/web-interface/popular",
  items: "data.list",
  fields: {
    title: "title",
    url: ({ bvid }) => `https://www.bilibili.com/video/${bvid}`,
    updated: ({ pubdate }) => pubdate * 1000,
    extra: {
      info: ({ owner, stat }) => `${owner.name} · ${formatNumber(stat.view)}观看 · ${formatNumber(stat.like)}点赞`,
      hover: "desc",
      icon: item => item.pic ? { url: item.pic, scale: 1 } : undefined,
    },
  },
}))

const ranking = defineJsonSourceFetcher<VideoItem>(() => ({
  url: "https://api.bilibili.com/x/web-interface/ranking/v2",
  items: "data.list",
  fields: {
    title: "title",
    url: ({ bvid }) => `https://www.bilibili.com/video/${bvid}`,
    updated: ({ pubdate }) => pubdate * 1000,
    extra: {
      info: ({ owner, stat }) => `${owner.name} · ${formatNumber(stat.view)}观看 · ${formatNumber(stat.like)}点赞`,
      hover: "desc",
      icon: item => item.pic ? { url: item.pic, scale: 1 } : undefined,
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
