import type { NewsItem } from "@newsnext/shared/types"
import { myFetch } from "@newsnext/source/utils/fetch"
import { $param } from "@newsnext/source/utils/params"
import { $provider, $source } from "@newsnext/source/utils/source"

const DYNAMIC_FEED_URL = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all"
const DYNAMIC_FEED_FEATURES = [
  "itemOpusStyle",
  "listOnlyfans",
  "opusBigCover",
  "onlyfansVote",
  "decorationCard",
  "onlyfansAssetsV2",
  "forwardListHidden",
  "ugcDelete",
  "onlyfansQaCard",
  "commentsNewVersion",
  "avatarAutoTheme",
  "sunflowerStyle",
  "cardsEnhance",
  "eva3CardOpus",
  "eva3CardVideo",
  "eva3CardComment",
  "eva3CardVote",
  "eva3CardUser",
]
const BILIBILI_WEB_LOCATION = "333.1365"
const RANKING_REGION_OPTIONS = [
  { label: "All", value: "0" },
  { label: "Animation", value: "1" },
  { label: "Anime", value: "13" },
  { label: "Guochuang", value: "167" },
  { label: "Music", value: "3" },
  { label: "Dance", value: "129" },
  { label: "Games", value: "4" },
  { label: "Knowledge", value: "36" },
  { label: "Technology", value: "188" },
  { label: "Sports", value: "234" },
  { label: "Cars", value: "223" },
  { label: "Life", value: "160" },
  { label: "Food", value: "211" },
  { label: "Animals", value: "217" },
  { label: "Kichiku", value: "119" },
  { label: "Fashion", value: "155" },
  { label: "Entertainment", value: "5" },
  { label: "Film & TV", value: "181" },
  { label: "Documentary", value: "177" },
  { label: "Movies", value: "23" },
  { label: "TV Series", value: "11" },
] as const

type RankingRegionId = (typeof RANKING_REGION_OPTIONS)[number]["value"]

function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}w`
  }
  return num.toString()
}

function normalizeBilibiliUrl(url: string): string {
  if (url.startsWith("//")) {
    return `https:${url}`
  }
  return url
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

interface DynamicFeedAuthor {
  face?: string
  name?: string
  pub_ts?: number
}

interface DynamicFeedArchive {
  bvid?: string
  cover?: string
  desc?: string
  duration_text?: string
  jump_url?: string
  stat?: {
    danmaku?: string
    play?: string
  }
  title?: string
}

interface DynamicFeedItem {
  modules?: {
    module_author?: DynamicFeedAuthor
    module_dynamic?: {
      major?: {
        archive?: DynamicFeedArchive
      } | null
    }
  }
}

interface DynamicFeedResponse {
  code: number
  message?: string
  data?: {
    items?: DynamicFeedItem[]
  }
}

function dynamicArchiveToNewsItem(item: DynamicFeedItem): NewsItem | null {
  const archive = item.modules?.module_dynamic?.major?.archive
  const author = item.modules?.module_author

  if (!archive?.title || !archive.bvid) {
    return null
  }

  const playText = archive.stat?.play ? `${archive.stat.play}观看` : undefined
  const danmakuText = archive.stat?.danmaku ? `${archive.stat.danmaku}弹幕` : undefined
  const inlineText = [author?.name, playText, danmakuText].filter(Boolean).join(" · ")
  const url = archive.jump_url
    ? normalizeBilibiliUrl(archive.jump_url)
    : `https://www.bilibili.com/video/${archive.bvid}`
  const timestamp = author?.pub_ts ? author.pub_ts * 1000 : undefined

  const newsItem: NewsItem = {
    title: archive.title,
    url,
    timestamp,
  }

  if (inlineText) {
    newsItem.inline = {
      text: inlineText,
      ...(author?.face ? { icon: { src: author.face, radius: 4 } } : {}),
    }
  }

  if (archive.desc || archive.cover) {
    newsItem.preview = {
      text: archive.desc ?? "",
      ...(archive.cover ? { picture: normalizeBilibiliUrl(archive.cover) } : {}),
    }
  }

  return newsItem
}

export async function fetchBilibiliFollowingVideos(): Promise<NewsItem[]> {
  const response = await myFetch<DynamicFeedResponse>(DYNAMIC_FEED_URL, {
    credentials: "include",
    headers: {
      "referer": "https://www.bilibili.com/",
      "user-agent": "Mozilla/5.0",
    },
    query: {
      "timezone_offset": -480,
      "type": "all",
      "platform": "web",
      "page": 1,
      "features": DYNAMIC_FEED_FEATURES.join(","),
      "web_location": BILIBILI_WEB_LOCATION,
      "x-bili-device-req-json": JSON.stringify({
        platform: "web",
        device: "pc",
        spmid: BILIBILI_WEB_LOCATION,
      }),
    },
  })

  if (response.code !== 0) {
    throw new Error(response.message ?? "Failed to load Bilibili following videos.")
  }

  return (response.data?.items ?? [])
    .map(dynamicArchiveToNewsItem)
    .filter((item): item is NewsItem => item !== null)
}

export default $provider({
  title: "Bilibili",
  home: "https://www.bilibili.com",
  color: "blue",
  sources: [
    $source.json(
      {
        key: "hotword",
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
    $source(
      {
        key: "following-videos",
        title: "关注视频",
        desc: "关注 UP 的视频动态",
        type: "timeline",
      },
      fetchBilibiliFollowingVideos,
    ),
    $source.json(
      {
        key: "ranking",
        title: "排行榜",
        type: "hottest",
        params: {
          region: $param.select<RankingRegionId>({
            title: "Region",
            options: [...RANKING_REGION_OPTIONS],
            default: "0",
          }),
        },
      },
      ({ region }) => ({
        url: "https://api.bilibili.com/x/web-interface/ranking/v2",
        fetchOptions: {
          query: {
            rid: region,
          },
        },
        items: "data.list",
        fields: {
          title: "title",
          url: ({ bvid }: VideoItem) => `https://www.bilibili.com/video/${bvid}`,
          inline: {
            text: ({ stat }: VideoItem) => `${formatNumber(stat.view)}观看 · ${formatNumber(stat.like)}点赞`,
            icon: (item: VideoItem) => item.owner.face ? { src: item.owner.face, radius: 4 } : undefined,
          },
          preview: {
            text: "desc",
            picture: (item: VideoItem) => item.pic,
          },
        },
      }),
    ),
  ],
})
