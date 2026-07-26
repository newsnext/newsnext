import type { NewsItem } from "@newsnext/shared/types"
import type { ProviderConfig } from "@newsnext/source/utils/source"
import { myFetch } from "@newsnext/source/utils/fetch"

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

interface DynamicFeedItem {
  modules?: {
    module_author?: {
      face?: string
      name?: string
      pub_ts?: number
    }
    module_dynamic?: {
      major?: {
        archive?: {
          bvid?: string
          cover?: string
          desc?: string
          jump_url?: string
          stat?: {
            danmaku?: string
            play?: string
          }
          title?: string
        }
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

function normalizeBilibiliUrl(url: string): string {
  return url.startsWith("//") ? `https:${url}` : url
}

function dynamicArchiveToNewsItem(item: DynamicFeedItem): NewsItem | null {
  const archive = item.modules?.module_dynamic?.major?.archive
  const author = item.modules?.module_author
  if (!archive?.title || !archive.bvid) return null

  const inlineText = [
    author?.name,
    archive.stat?.play ? `${archive.stat.play} views` : undefined,
    archive.stat?.danmaku ? `${archive.stat.danmaku} danmaku` : undefined,
  ].filter(Boolean).join(" · ")
  const newsItem: NewsItem = {
    title: archive.title,
    url: archive.jump_url
      ? normalizeBilibiliUrl(archive.jump_url)
      : `https://www.bilibili.com/video/${archive.bvid}`,
  }

  if (author?.pub_ts) newsItem.timestamp = author.pub_ts * 1000
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

async function fetchBilibiliFollowingVideos(): Promise<NewsItem[]> {
  const response = await myFetch<DynamicFeedResponse>(DYNAMIC_FEED_URL, {
    credentials: "include",
    headers: {
      referer: "https://www.bilibili.com/",
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

export default {
  title: "Bilibili",
  home: "https://www.bilibili.com",
  color: "blue",
  category: "china",
  sources: {
    "hotword": {
      metadata: {
        title: "Hot Search",
        type: "hottest",
      },
      loader: {
        type: "json",
        url: "https://s.search.bilibili.com/main/hotword?limit=30",
        items: "list",
        fields: {
          title: "show_name",
          url: {
            select: "keyword",
            template: "https://search.bilibili.com/all?keyword={{ value | url_query }}",
          },
          inline: {
            mark: "icon",
          },
        },
      },
      cache: "5m",
    },
    "following-videos": {
      metadata: {
        title: "Following Videos",
        desc: "Video updates from followed creators",
        type: "timeline",
      },
      loader: {
        type: "custom",
        load: fetchBilibiliFollowingVideos,
      },
      capabilities: {
        network: ["api.bilibili.com"],
        cookies: ["api.bilibili.com", "www.bilibili.com"],
      },
      cache: "5m",
    },
    "ranking": {
      metadata: {
        title: "Ranking",
        type: "hottest",
      },
      params: {
        region: {
          type: "select",
          title: "Region",
          values: RANKING_REGION_OPTIONS,
          default: "0",
        },
      },
      loader: {
        type: "json",
        url: "https://api.bilibili.com/x/web-interface/ranking/v2?rid={{ params.region | url_query }}",
        items: "data.list",
        fields: {
          title: "title",
          url: {
            select: "bvid",
            template: "https://www.bilibili.com/video/{{ value | url_path }}",
          },
          timestamp: {
            select: "pubdate",
            template: "{{ value | times: 1000 }}",
          },
          inline: {
            text: {
              template: "{{ item.stat.view }} views · {{ item.stat.like }} likes",
            },
            icon: "owner.face && {src: owner.face, radius: `4`}",
          },
          preview: {
            text: "desc",
            picture: "pic",
          },
        },
      },
      cache: "15m",
    },
  },
} satisfies ProviderConfig
