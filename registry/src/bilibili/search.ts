import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import type { NewsItemInput, SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import {
  bilibiliApiCapabilities,
  normalizeBilibiliUrl,
  parseBilibiliNumericCount,
  parseBilibiliTimestamp,
} from "./shared"
import { getBilibiliWbiKeys, signBilibiliWbiParams } from "./wbi"

const BILIBILI_SEARCH_URL = "https://api.bilibili.com/x/web-interface/wbi/search/type"
const BILIBILI_SEARCH_TIMEZONE_OFFSET = "+08:00"

type BilibiliSearchDate = "all" | "custom" | "day" | "halfyear" | "week"
type BilibiliSearchOrder = "click" | "dm" | "pubdate" | "stow"

const BILIBILI_SEARCH_ORDER_LABELS: Record<BilibiliSearchOrder, string> = {
  click: "最多播放",
  dm: "最多弹幕",
  pubdate: "最新发布",
  stow: "最多收藏",
}
const BILIBILI_SEARCH_DATE_DAYS = {
  day: 1,
  halfyear: 180,
  week: 7,
} as const satisfies Record<Exclude<BilibiliSearchDate, "all" | "custom">, number>

interface BilibiliSearchVideoItem {
  arcurl?: string
  author?: string
  bvid?: string
  danmaku?: number | string
  description?: string
  favorites?: number | string
  mid?: number
  pic?: string
  play?: number | string
  pubdate?: number
  title?: string
  upic?: string
}

interface BilibiliSearchResponse {
  code: number
  data?: {
    result?: BilibiliSearchVideoItem[]
  }
  message?: string
}

interface BilibiliSearchDateRange {
  begin: number
  end: number
}

function formatBilibiliSearchDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(timestamp)
}

function parseBilibiliSearchDate(value: string): number {
  return Math.floor(Date.parse(`${value}T00:00:00${BILIBILI_SEARCH_TIMEZONE_OFFSET}`) / 1000)
}

export function getBilibiliSearchDateRange(
  date: BilibiliSearchDate,
  startDate: string,
  endDate: string,
  now = Date.now(),
): BilibiliSearchDateRange {
  if (date === "all") return { begin: 0, end: 0 }

  if (date === "custom") {
    const begin = parseBilibiliSearchDate(startDate)
    const endStart = parseBilibiliSearchDate(endDate)
    return { begin, end: endStart + 86_399 }
  }

  const days = BILIBILI_SEARCH_DATE_DAYS[date]
  const today = formatBilibiliSearchDate(now)
  const todayStart = parseBilibiliSearchDate(today)
  return {
    begin: todayStart - (days - 1) * 86_400,
    end: todayStart + 86_399,
  }
}

function cleanBilibiliSearchText(value: string | undefined): string | undefined {
  const text = value?.replace(/<[^>]+>/g, "").trim()
  return text || undefined
}

export function searchVideoItemToNewsItem(item: BilibiliSearchVideoItem): NewsItemInput | null {
  const title = cleanBilibiliSearchText(item.title)
  const url = item.bvid
    ? `https://www.bilibili.com/video/${item.bvid}`
    : item.arcurl
      ? normalizeBilibiliUrl(item.arcurl)
      : undefined
  if (!title || !url) return null

  return {
    title,
    url,
    publishedAt: parseBilibiliTimestamp(item.pubdate),
    author: {
      name: item.author,
      home: item.mid ? `https://space.bilibili.com/${item.mid}` : undefined,
    },
    icon: {
      kind: "author",
      label: item.author,
      src: item.upic ? normalizeBilibiliUrl(item.upic) : undefined,
    },
    stats: {
      stars: parseBilibiliNumericCount(item.favorites),
      views: parseBilibiliNumericCount(item.play),
    },
    attributes: {
      danmaku: parseBilibiliNumericCount(item.danmaku),
    },
    content: {
      text: cleanBilibiliSearchText(item.description),
      pictures: item.pic ? normalizeBilibiliUrl(item.pic) : undefined,
    },
  }
}

async function fetchBilibiliSearch(
  {
    date,
    duration,
    endDate,
    keyword,
    order,
    startDate,
  }: {
    date: BilibiliSearchDate
    duration: string
    endDate: string
    keyword: string
    order: BilibiliSearchOrder
    startDate: string
  },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const range = getBilibiliSearchDateRange(date, startDate, endDate)
  const { imgUrl, subUrl } = await getBilibiliWbiKeys(context)
  const searchParams = await signBilibiliWbiParams({
    duration: Number(duration),
    keyword,
    order,
    page: 1,
    page_size: 42,
    platform: "pc",
    pubtime_begin_s: range.begin,
    pubtime_end_s: range.end,
    search_type: "video",
    web_location: 1430654,
  }, imgUrl, subUrl)
  const response = await context.fetch.get(BILIBILI_SEARCH_URL, {
    headers: { referer: "https://search.bilibili.com/" },
    searchParams,
  }).json<BilibiliSearchResponse>()
  if (response.code !== 0) {
    throw new Error(response.message ?? "Failed to search Bilibili videos.")
  }

  const homeParams = new URLSearchParams({
    keyword,
    order,
  })
  if (duration !== "0") homeParams.set("duration", duration)
  if (range.begin && range.end) {
    homeParams.set("pubtime_begin_s", String(range.begin))
    homeParams.set("pubtime_end_s", String(range.end))
  }
  return {
    items: (response.data?.result ?? [])
      .map(searchVideoItemToNewsItem)
      .filter((item): item is NewsItemInput => item !== null),
    metadata: {
      title: `${keyword} | ${BILIBILI_SEARCH_ORDER_LABELS[order]}`,
      home: `https://search.bilibili.com/video?${homeParams}`,
      type: order === "pubdate" ? undefined : "ranking",
    },
  }
}

function readSearchDateRange(): BilibiliSearchDate | undefined {
  const page = globalThis as unknown as { location: { href: string } }
  const params = new URL(page.location.href).searchParams
  const begin = Number(params.get("pubtime_begin_s"))
  const end = Number(params.get("pubtime_end_s"))
  if (!begin || !end || begin > end) return undefined
  const days = Math.trunc((end - begin) / 86_400) + 1
  if (days === 1) return "day"
  if (days === 7) return "week"
  if (days === 180) return "halfyear"
  return "custom"
}

export const searchSource = {
  version: 3,
  metadata: {
    title: "视频搜索 | 最新发布",
    desc: "按关键词搜索哔哩哔哩视频",
  },
  params: {
    keyword: {
      type: "text",
      title: "关键词",
      default: "科技",
      required: true,
    },
    order: {
      type: "select",
      title: "排序",
      values: [
        { label: "最多播放", value: "click" },
        { label: "最新发布", value: "pubdate" },
        { label: "最多弹幕", value: "dm" },
        { label: "最多收藏", value: "stow" },
      ],
      default: "pubdate",
    },
    date: {
      type: "select",
      title: "日期",
      values: [
        { label: "全部日期", value: "all" },
        { label: "最近一天", value: "day" },
        { label: "最近一周", value: "week" },
        { label: "最近半年", value: "halfyear" },
        { label: "自定义日期", value: "custom" },
      ],
      default: "all",
    },
    startDate: {
      type: "text",
      title: "开始日期",
      description: "自定义日期使用 YYYY-MM-DD。",
      default: "",
      validate: { regex: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    endDate: {
      type: "text",
      title: "结束日期",
      description: "自定义日期使用 YYYY-MM-DD。",
      default: "",
      validate: { regex: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    duration: {
      type: "select",
      title: "时长",
      values: [
        { label: "全部时长", value: "0" },
        { label: "10 分钟以下", value: "1" },
        { label: "10–30 分钟", value: "2" },
        { label: "30–60 分钟", value: "3" },
        { label: "60 分钟以上", value: "4" },
      ],
      default: "0",
    },
  },
  radar: [
    {
      id: "bilibili-video-search",
      match: {
        hosts: ["search.bilibili.com"],
        paths: ["/video"],
        query: ["keyword"],
      },
      patch: {
        params: {
          keyword: "{{ scope.query.keyword }}",
          order: "{{ scope.query.order }}",
          date: readSearchDateRange,
          startDate: () => {
            const page = globalThis as unknown as { location: { href: string } }
            const value = Number(new URL(page.location.href).searchParams.get("pubtime_begin_s"))
            if (!value) return undefined
            return new Intl.DateTimeFormat("en-CA", {
              day: "2-digit",
              month: "2-digit",
              timeZone: "Asia/Shanghai",
              year: "numeric",
            }).format(value * 1000)
          },
          endDate: () => {
            const page = globalThis as unknown as { location: { href: string } }
            const value = Number(new URL(page.location.href).searchParams.get("pubtime_end_s"))
            if (!value) return undefined
            return new Intl.DateTimeFormat("en-CA", {
              day: "2-digit",
              month: "2-digit",
              timeZone: "Asia/Shanghai",
              year: "numeric",
            }).format(value * 1000)
          },
          duration: "{{ scope.query.duration }}",
        },
      },
    },
  ],
  loader: {
    type: "custom",
    load: fetchBilibiliSearch,
  },
  capabilities: bilibiliApiCapabilities,
} satisfies ProviderSourceConfig
