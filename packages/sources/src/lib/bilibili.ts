import { $provider, $source } from "../utils/source"

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

export default $provider({
  title: "Bilibili",
  home: "https://www.bilibili.com",
  color: "blue",
  sources: [
    $source.json(
      {
        name: "default",
        title: "热搜",
        type: "hottest",
      },
      () => ({
        url: "https://s.search.bilibili.com/main/hotword?limit=30",
        items: "list",
        fields: {
          title: "show_name",
          url: ({ keyword }: HotSearchItem) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`,
          inline: {
            mark: (item: HotSearchItem) => item.icon,
          },
        },
      }),
    ),
    $source.json(
      {
        name: "hot-video",
        title: "热门视频",
        type: "hottest",
      },
      () => ({
        url: "https://api.bilibili.com/x/web-interface/popular",
        items: "data.list",
        fields: {
          title: "title",
          url: ({ bvid }: VideoItem) => `https://www.bilibili.com/video/${bvid}`,
          timestamp: ({ pubdate }: VideoItem) => pubdate * 1000,
          inline: {
            text: ({ stat }: VideoItem) => `${formatNumber(stat.view)}观看 · ${formatNumber(stat.like)}点赞`,
            icon: (item: VideoItem) => item.owner.face,
          },
          preview: {
            text: "desc",
            picture: (item: VideoItem) => item.pic,
            iframe: (item: VideoItem) => ({
              src: `https://player.bilibili.com/player.html?bvid=${item.bvid}`,
            }),
          },
        },
      }),
    ),
    $source.json(
      {
        name: "ranking",
        title: "排行榜",
        type: "hottest",
      },
      () => ({
        url: "https://api.bilibili.com/x/web-interface/ranking/v2",
        items: "data.list",
        fields: {
          title: "title",
          url: ({ bvid }: VideoItem) => `https://www.bilibili.com/video/${bvid}`,
          timestamp: ({ pubdate }: VideoItem) => pubdate * 1000,
          inline: {
            text: ({ stat }: VideoItem) => `${formatNumber(stat.view)}观看 · ${formatNumber(stat.like)}点赞`,
            icon: (item: VideoItem) => item.owner.face ? { src: item.owner.face, radius: 4 } : undefined,
          },
          preview: {
            text: "desc",
            picture: (item: VideoItem) => item.pic,
            iframe: (item: VideoItem) => ({
              src: `https://player.bilibili.com/player.html?bvid=${item.bvid}`,
            }),
          },
        },
      }),
    ),
  ],
})
