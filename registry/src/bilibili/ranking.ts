import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import type { NewsItemInput, SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import { bilibiliApiCapabilities, normalizeBilibiliUrl, parseBilibiliCount } from "./shared"

const BILIBILI_RANKING_URL = "https://api.bilibili.com/x/web-interface/ranking/v2"
const BILIBILI_ANIME_RANKING_URL = "https://api.bilibili.com/pgc/web/rank/list"
const BILIBILI_PGC_RANKING_URL = "https://api.bilibili.com/pgc/season/rank/web/list"
const BILIBILI_PGC_ITEM_TEMPLATE = {
  inline: "{% if scope.item.attributes.episode %}{{ scope.item.attributes.episode }}{% endif %}{% if scope.item.attributes.rating %} · {{ scope.item.attributes.rating }} rating{% endif %}",
} as const
const RANKING_REGIONS = [
  { apiRid: 0, label: "全部", slug: "all", value: "0" },
  { label: "番剧", pgcUrl: BILIBILI_ANIME_RANKING_URL, seasonType: 1, slug: "anime", value: "13" },
  { label: "国创", pgcUrl: BILIBILI_PGC_RANKING_URL, seasonType: 4, slug: "guochuang", value: "167" },
  { label: "纪录片", pgcUrl: BILIBILI_PGC_RANKING_URL, seasonType: 3, slug: "documentary", value: "177" },
  { label: "电影", pgcUrl: BILIBILI_PGC_RANKING_URL, seasonType: 2, slug: "movie", value: "23" },
  { label: "电视剧", pgcUrl: BILIBILI_PGC_RANKING_URL, seasonType: 5, slug: "tv", value: "11" },
  { label: "综艺", pgcUrl: BILIBILI_PGC_RANKING_URL, seasonType: 7, slug: "variety", value: "71" },
  { apiRid: 1005, label: "动画", slug: "douga", value: "1" },
  { apiRid: 1008, label: "游戏", slug: "game", value: "4" },
  { apiRid: 1007, label: "鬼畜", slug: "kichiku", value: "119" },
  { apiRid: 1003, label: "音乐", slug: "music", value: "3" },
  { apiRid: 1004, label: "舞蹈", slug: "dance", value: "129" },
  { apiRid: 1001, label: "影视", slug: "cinephile", value: "181" },
  { apiRid: 1002, label: "娱乐", slug: "ent", value: "5" },
  { apiRid: 1010, label: "知识", slug: "knowledge", value: "36" },
  { apiRid: 1012, label: "科技数码", slug: "tech", value: "188" },
  { apiRid: 1020, label: "美食", slug: "food", value: "211" },
  { apiRid: 1013, label: "汽车", slug: "car", value: "223" },
  { apiRid: 1014, label: "时尚美妆", slug: "fashion", value: "155" },
  { apiRid: 1018, label: "体育运动", slug: "sports", value: "234" },
  { apiRid: 1024, label: "动物", slug: "animal", value: "217" },
] as const
const RANKING_REGION_OPTIONS = RANKING_REGIONS.map(({ label, value }) => ({ label, value }))

interface BilibiliRankingRequest {
  kind: "pgc" | "video"
  searchParams: Record<string, number | string>
  url: string
}

interface BilibiliVideoRankingItem {
  bvid?: string
  desc?: string
  owner?: {
    face?: string
    name?: string
  }
  pic?: string
  pubdate?: number
  stat?: {
    favorite?: number
    like?: number
    reply?: number
    share?: number
    view?: number
  }
  title?: string
}

interface BilibiliPgcRankingItem {
  cover?: string
  desc?: string
  icon_font?: {
    text?: string
  }
  new_ep?: {
    index_show?: string
  }
  rating?: string
  season_id?: number
  stat?: {
    view?: number
  }
  title?: string
  url?: string
}

interface BilibiliVideoRankingResponse {
  code: number
  data?: {
    list?: BilibiliVideoRankingItem[]
  }
  message?: string
}

interface BilibiliPgcRankingResponse {
  code: number
  data?: {
    list?: BilibiliPgcRankingItem[]
  }
  message?: string
  result?: {
    list?: BilibiliPgcRankingItem[]
  }
}

export function getBilibiliRankingRequest(regionValue: string): BilibiliRankingRequest {
  const region = RANKING_REGIONS.find(candidate => candidate.value === regionValue)
  if (!region) throw new Error(`Unknown Bilibili ranking region "${regionValue}".`)

  if ("apiRid" in region) {
    return {
      kind: "video",
      url: BILIBILI_RANKING_URL,
      searchParams: {
        rid: region.apiRid,
        type: "all",
      },
    }
  }

  return {
    kind: "pgc",
    url: region.pgcUrl,
    searchParams: {
      day: 3,
      season_type: region.seasonType,
    },
  }
}

export function videoRankingItemToNewsItem(item: BilibiliVideoRankingItem): NewsItemInput | null {
  if (!item.title || !item.bvid) return null

  return {
    title: item.title,
    url: `https://www.bilibili.com/video/${item.bvid}`,
    publishedAt: item.pubdate ? item.pubdate * 1000 : undefined,
    author: { name: item.owner?.name },
    stats: {
      views: item.stat?.view,
      likes: item.stat?.like,
      comments: item.stat?.reply,
      reposts: item.stat?.share,
      stars: item.stat?.favorite,
    },
    icon: {
      kind: "author",
      label: item.owner?.name,
      src: item.owner?.face ? normalizeBilibiliUrl(item.owner.face) : undefined,
    },
    content: {
      text: item.desc,
      pictures: item.pic ? normalizeBilibiliUrl(item.pic) : undefined,
    },
  }
}

export function pgcRankingItemToNewsItem(item: BilibiliPgcRankingItem): NewsItemInput | null {
  const url = item.url
    ?? (item.season_id ? `https://www.bilibili.com/bangumi/play/ss${item.season_id}` : undefined)
  if (!item.title || !url) return null

  return {
    title: item.title,
    url: normalizeBilibiliUrl(url),
    stats: { views: item.stat?.view ?? parseBilibiliCount(item.icon_font?.text) },
    attributes: {
      episode: item.new_ep?.index_show,
      rating: item.rating,
    },
    content: {
      pictures: item.cover ? normalizeBilibiliUrl(item.cover) : undefined,
      text: item.desc ?? item.new_ep?.index_show,
    },
  }
}

async function fetchBilibiliRanking(
  { region }: { region: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const request = getBilibiliRankingRequest(region)
  const fetchOptions = {
    headers: {
      referer: "https://www.bilibili.com/",
    },
    searchParams: request.searchParams,
  }

  if (request.kind === "video") {
    const response = await context.fetch.get(request.url, fetchOptions).json<BilibiliVideoRankingResponse>()
    if (response.code !== 0) {
      throw new Error(response.message ?? "Failed to load Bilibili video ranking.")
    }
    return {
      items: (response.data?.list ?? [])
        .map(videoRankingItemToNewsItem)
        .filter((item): item is NewsItemInput => item !== null),
    }
  }

  const response = await context.fetch.get(request.url, fetchOptions).json<BilibiliPgcRankingResponse>()
  if (response.code !== 0) {
    throw new Error(response.message ?? "Failed to load Bilibili PGC ranking.")
  }
  return {
    items: (response.result?.list ?? response.data?.list ?? [])
      .map(pgcRankingItemToNewsItem)
      .filter((item): item is NewsItemInput => item !== null),
    itemTemplate: BILIBILI_PGC_ITEM_TEMPLATE,
  }
}

export const rankingSource = {
  metadata: {
    title: "排行榜",
  },
  params: {
    region: {
      type: "select",
      title: "分区",
      values: RANKING_REGION_OPTIONS,
      default: "0",
    },
  },
  radar: RANKING_REGIONS.map(({ label, slug, value }) => ({
    id: `bilibili-ranking-${slug}`,
    match: {
      hosts: ["bilibili.com"],
      paths: [`/v/popular/rank/${slug}`],
    },
    patch: {
      params: {
        region: value,
      },
      metadata: {
        home: `/v/popular/rank/${slug}`,
        title: label === "全部" ? "排行榜" : `${label}排行榜`,
      },
    },
  })),
  loader: {
    type: "custom",
    load: fetchBilibiliRanking,
  },
  capabilities: bilibiliApiCapabilities,
  version: 3,
} satisfies ProviderSourceConfig
