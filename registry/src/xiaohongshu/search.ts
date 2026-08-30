import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import type { SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import type { XiaohongshuFeedItem } from "./shared"
import { parseRelativeDate } from "@newsnext/date-parser"
import { parseXiaohongshuNoteTimestamp, xiaohongshuFeedItemToNewsItem } from "./shared"
import { signXiaohongshuPost } from "./signing"

const SEARCH_URI = "/api/sns/web/v2/search/notes"
const SEARCH_URL = `https://so.xiaohongshu.com${SEARCH_URI}`

type SearchOrder = "collect_descending" | "comment_descending" | "general" | "popularity_descending" | "time_descending"
type SearchNoteType = "all" | "image" | "video"
type SearchTime = "all" | "day" | "halfyear" | "week"
type SearchRange = "all" | "following" | "seen" | "unseen"
type SearchDistance = "all" | "nearby" | "same_city"

interface SearchParams {
  distance: SearchDistance
  keyword: string
  noteType: SearchNoteType
  order: SearchOrder
  range: SearchRange
  time: SearchTime
}

interface SearchResponse {
  code?: number
  data?: {
    items?: SearchApiItem[]
  }
  message?: string
  success?: boolean
}

interface SearchApiItem {
  id?: string
  model_type?: string
  note_card?: {
    cover?: {
      info_list?: Array<{ image_scene?: string, url?: string }>
      url?: string
      url_default?: string
      url_pre?: string
    }
    corner_tag_info?: Array<{
      text?: string
      type?: string
    }>
    display_title?: string
    interact_info?: {
      collected_count?: number | string
      comment_count?: number | string
      liked_count?: number | string
      shared_count?: number | string
    }
    time?: number
    user?: {
      avatar?: string
      nick_name?: string
      nickname?: string
      user_id?: string
    }
  }
  xsec_token?: string
}

const ORDER_LABELS: Record<SearchOrder, string> = {
  collect_descending: "最多收藏",
  comment_descending: "最多评论",
  general: "综合",
  popularity_descending: "最多点赞",
  time_descending: "最新",
}

const NOTE_TYPE_TAGS: Record<SearchNoteType, string> = {
  all: "不限",
  image: "普通笔记",
  video: "视频笔记",
}

const TIME_TAGS: Record<SearchTime, string> = {
  all: "不限",
  day: "一天内",
  halfyear: "半年内",
  week: "一周内",
}

const RANGE_TAGS: Record<SearchRange, string> = {
  all: "不限",
  following: "已关注",
  seen: "已看过",
  unseen: "未看过",
}

const DISTANCE_TAGS: Record<SearchDistance, string> = {
  all: "不限",
  nearby: "附近",
  same_city: "同城",
}

function createSearchId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 2_147_483_646).toString(36)}`
}

function createSearchPayload(params: SearchParams): Record<string, unknown> {
  return {
    keyword: params.keyword,
    page: 1,
    page_size: 20,
    search_id: createSearchId(),
    sort: "general",
    note_type: 0,
    ext_flags: [],
    filters: [
      { tags: [params.order], type: "sort_type" },
      { tags: [NOTE_TYPE_TAGS[params.noteType]], type: "filter_note_type" },
      { tags: [TIME_TAGS[params.time]], type: "filter_note_time" },
      { tags: [RANGE_TAGS[params.range]], type: "filter_note_range" },
      { tags: [DISTANCE_TAGS[params.distance]], type: "filter_pos_distance" },
    ],
    geo: "",
    image_formats: ["jpg", "webp", "avif"],
    session_id: crypto.randomUUID(),
  }
}

function normalizeEpochMilliseconds(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return undefined
  return value < 1_000_000_000_000 ? value * 1000 : value
}

function parseSearchPublishedAt(item: SearchApiItem, referenceDate: Date): number | undefined {
  const explicitTime = normalizeEpochMilliseconds(item.note_card?.time)
  if (explicitTime !== undefined) return explicitTime

  const label = item.note_card?.corner_tag_info
    ?.find(tag => tag.type === "publish_time")
    ?.text
    ?.trim()
  if (label && /刚刚|刚才|现在|前$|昨天|前天|今天/.test(label)) {
    const timestamp = parseRelativeDate(label, "Asia/Shanghai", referenceDate).getTime()
    if (Number.isFinite(timestamp)) return timestamp
  }
  return parseXiaohongshuNoteTimestamp(item.id)
}

export function normalizeSearchItem(item: SearchApiItem, referenceDate: Date = new Date()): XiaohongshuFeedItem {
  const card = item.note_card
  return {
    id: item.id,
    modelType: item.model_type,
    xsecToken: item.xsec_token,
    noteCard: card
      ? {
          displayTitle: card.display_title,
          time: parseSearchPublishedAt(item, referenceDate),
          user: card.user
            ? {
                avatar: card.user.avatar,
                nickName: card.user.nick_name,
                nickname: card.user.nickname,
                userId: card.user.user_id,
              }
            : undefined,
          interactInfo: card.interact_info
            ? {
                collectedCount: card.interact_info.collected_count,
                commentCount: card.interact_info.comment_count,
                likedCount: card.interact_info.liked_count,
                sharedCount: card.interact_info.shared_count,
              }
            : undefined,
          cover: card.cover
            ? {
                infoList: card.cover.info_list?.map(image => ({
                  imageScene: image.image_scene,
                  url: image.url,
                })),
                url: card.cover.url,
                urlDefault: card.cover.url_default,
                urlPre: card.cover.url_pre,
              }
            : undefined,
        }
      : undefined,
  }
}

async function fetchXiaohongshuSearch(
  params: SearchParams,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const a1 = context.secrets?.a1?.trim()
  if (!a1) throw new Error("Xiaohongshu a1 cookie is required.")
  const cookies = {
    a1,
    ...(context.secrets?.webSession ? { web_session: context.secrets.webSession } : {}),
  }
  const payload = createSearchPayload(params)
  const headers = await signXiaohongshuPost(
    SEARCH_URI,
    payload,
    cookies,
    `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(params.keyword)}`,
  )
  const rawResponse = await context.fetch.post(SEARCH_URL, {
    headers: {
      ...headers,
      "content-type": "application/json;charset=UTF-8",
    },
    json: payload,
  })
  const responseDate = new Date(rawResponse.headers.get("date") ?? Date.now())
  const response = await rawResponse.json<SearchResponse>()
  if (response.success !== true || response.code !== 0) {
    throw new Error(response.message ?? `Xiaohongshu search failed with code ${response.code ?? "unknown"}.`)
  }

  const home = new URL("/search_result", "https://www.xiaohongshu.com")
  home.searchParams.set("keyword", params.keyword)
  home.searchParams.set("source", "web_search_result_notes")
  home.searchParams.set("type", "51")
  const items = (response.data?.items ?? [])
    .map(item => normalizeSearchItem(item, responseDate))
    .map(item => xiaohongshuFeedItemToNewsItem(item, "pc_search"))
    .filter(item => item !== null)
  if (params.order === "time_descending") {
    items.sort((left, right) => (right.publishedAt ?? 0) - (left.publishedAt ?? 0))
  }
  return {
    items,
    metadata: {
      title: `${params.keyword} | ${ORDER_LABELS[params.order]}`,
      home: home.toString(),
      ...(params.order === "time_descending" ? {} : { type: "ranking" as const }),
    },
  }
}

export const searchSource = {
  version: 1,
  metadata: {
    title: "笔记搜索",
    desc: "按关键词和页面筛选条件搜索小红书笔记",
  },
  params: {
    keyword: {
      type: "text",
      title: "关键词",
      default: "AI 编程",
      required: true,
    },
    order: {
      type: "select",
      title: "排序",
      values: [
        { label: "综合", value: "general" },
        { label: "最新", value: "time_descending" },
        { label: "最多点赞", value: "popularity_descending" },
        { label: "最多评论", value: "comment_descending" },
        { label: "最多收藏", value: "collect_descending" },
      ],
      default: "general",
    },
    noteType: {
      type: "select",
      title: "笔记类型",
      values: [
        { label: "不限", value: "all" },
        { label: "视频", value: "video" },
        { label: "图文", value: "image" },
      ],
      default: "all",
    },
    time: {
      type: "select",
      title: "发布时间",
      values: [
        { label: "不限", value: "all" },
        { label: "一天内", value: "day" },
        { label: "一周内", value: "week" },
        { label: "半年内", value: "halfyear" },
      ],
      default: "all",
    },
    range: {
      type: "select",
      title: "搜索范围",
      values: [
        { label: "不限", value: "all" },
        { label: "已看过", value: "seen" },
        { label: "未看过", value: "unseen" },
        { label: "已关注", value: "following" },
      ],
      default: "all",
    },
    distance: {
      type: "select",
      title: "位置距离",
      values: [
        { label: "不限", value: "all" },
        { label: "同城", value: "same_city" },
        { label: "附近", value: "nearby" },
      ],
      default: "all",
    },
  },
  radar: [{
    id: "xiaohongshu-search",
    match: {
      hosts: ["www.xiaohongshu.com"],
      paths: ["/search_result", "/search_result/", "/search_result_ai", "/search_result_ai/"],
      query: ["keyword"],
    },
    patch: {
      params: {
        keyword: () => {
          const page = globalThis as unknown as { location: { href: string } }
          let keyword = new URL(page.location.href).searchParams.get("keyword") ?? ""
          for (let pass = 0; pass < 2; pass += 1) {
            try {
              const decoded = decodeURIComponent(keyword)
              if (decoded === keyword) break
              keyword = decoded
            } catch {
              break
            }
          }
          return keyword
        },
        order: async () => {
          const page = globalThis as unknown as {
            document: {
              documentElement: { setAttribute: (name: string, value: string) => void }
              querySelector: (selector: string) => {
                classList: { contains: (name: string) => boolean }
                click: () => void
              } | null
              querySelectorAll: (selector: string) => ArrayLike<{
                querySelectorAll: (selector: string) => ArrayLike<{ classList: { contains: (name: string) => boolean } }>
              }>
            }
          }
          const trigger = page.document.querySelector(".filter")
          if (!trigger?.classList.contains("active")) {
            page.document.documentElement.setAttribute("data-newsnext-xhs-filter-indices", "[0,0,0,0,0]")
            return "general"
          }
          const wasOpen = Boolean(page.document.querySelector(".filter-panel"))
          if (!wasOpen) {
            trigger.click()
            await new Promise(resolve => setTimeout(resolve, 300))
          }
          const indices = Array.from(page.document.querySelectorAll(".filter-panel .filters"), group => (
            Array.from(group.querySelectorAll(".tags:not([aria-hidden=\"true\"])"))
              .findIndex(tag => tag.classList.contains("active"))
          ))
          page.document.documentElement.setAttribute("data-newsnext-xhs-filter-indices", JSON.stringify(indices))
          if (!wasOpen) trigger.click()
          return ["general", "time_descending", "popularity_descending", "comment_descending", "collect_descending"][indices[0] ?? 0]
        },
        noteType: async () => {
          const page = globalThis as unknown as {
            document: {
              documentElement: { getAttribute: (name: string) => string | null }
            }
          }
          await new Promise(resolve => setTimeout(resolve, 400))
          const indices = JSON.parse(page.document.documentElement.getAttribute("data-newsnext-xhs-filter-indices") ?? "[]") as number[]
          const index = indices[1]
          return ["all", "video", "image"][index ?? 0]
        },
        time: async () => {
          const page = globalThis as unknown as {
            document: {
              documentElement: { getAttribute: (name: string) => string | null }
            }
          }
          await new Promise(resolve => setTimeout(resolve, 400))
          const indices = JSON.parse(page.document.documentElement.getAttribute("data-newsnext-xhs-filter-indices") ?? "[]") as number[]
          const index = indices[2]
          return ["all", "day", "week", "halfyear"][index ?? 0]
        },
        range: async () => {
          const page = globalThis as unknown as {
            document: {
              documentElement: { getAttribute: (name: string) => string | null }
            }
          }
          await new Promise(resolve => setTimeout(resolve, 400))
          const indices = JSON.parse(page.document.documentElement.getAttribute("data-newsnext-xhs-filter-indices") ?? "[]") as number[]
          const index = indices[3]
          return ["all", "seen", "unseen", "following"][index ?? 0]
        },
        distance: async () => {
          const page = globalThis as unknown as {
            document: {
              documentElement: { getAttribute: (name: string) => string | null }
            }
          }
          await new Promise(resolve => setTimeout(resolve, 400))
          const indices = JSON.parse(page.document.documentElement.getAttribute("data-newsnext-xhs-filter-indices") ?? "[]") as number[]
          const index = indices[4]
          return ["all", "same_city", "nearby"][index ?? 0]
        },
      },
      metadata: {
        title: "{{ scope.params.keyword }} | 搜索",
        home: "https://www.xiaohongshu.com/search_result?keyword={{ scope.params.keyword | url_query }}&source=web_search_result_notes&type=51",
      },
    },
  }],
  secrets: [
    {
      key: "a1",
      type: "cookie",
      origin: "https://www.xiaohongshu.com",
      itemKey: "a1",
      cache: false,
      required: true,
    },
    {
      key: "webSession",
      type: "cookie",
      origin: "https://www.xiaohongshu.com",
      itemKey: "web_session",
      cache: false,
    },
  ],
  loader: { type: "custom", load: fetchXiaohongshuSearch },
  capabilities: {
    network: ["so.xiaohongshu.com"],
    cookies: ["www.xiaohongshu.com"],
  },
  requestRules: [{
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "Origin", operation: "set", value: "https://www.xiaohongshu.com" },
        { header: "Referer", operation: "set", value: "https://www.xiaohongshu.com/" },
      ],
    },
    condition: {
      requestDomains: ["so.xiaohongshu.com"],
      resourceTypes: ["xmlhttprequest"],
    },
  }],
} satisfies ProviderSourceConfig
