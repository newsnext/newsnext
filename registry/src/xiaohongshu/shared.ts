import type { NewsItemInput } from "@newsnext/source-kit/types"

const INITIAL_STATE_MARKER = "window.__INITIAL_STATE__="
const SCRIPT_END = "</script>"

interface XiaohongshuImageInfo {
  imageScene?: string
  url?: string
}

interface XiaohongshuCover {
  infoList?: XiaohongshuImageInfo[]
  url?: string
  urlDefault?: string
  urlPre?: string
}

interface XiaohongshuUser {
  avatar?: string
  nickName?: string
  nickname?: string
  userId?: string
}

export interface XiaohongshuNoteCard {
  cover?: XiaohongshuCover
  displayTitle?: string
  interactInfo?: {
    collectedCount?: number | string
    commentCount?: number | string
    likedCount?: number | string
    sharedCount?: number | string
  }
  noteId?: string
  time?: number
  user?: XiaohongshuUser
  xsecToken?: string
}

export interface XiaohongshuFeedItem {
  id?: string
  modelType?: string
  noteCard?: XiaohongshuNoteCard
  xsecToken?: string
}

function normalizeInitialState(value: string): string {
  return value
    .replace(/\bundefined\b/g, "null")
    .replace(/new Map\(\[\]\)/g, "[]")
    .replace(/new Set\(\[\]\)/g, "[]")
}

export function parseXiaohongshuInitialState(html: string): unknown {
  const markerIndex = html.indexOf(INITIAL_STATE_MARKER)
  if (markerIndex < 0) throw new Error("Xiaohongshu page did not contain initial state.")

  const jsonStart = markerIndex + INITIAL_STATE_MARKER.length
  const jsonEnd = html.indexOf(SCRIPT_END, jsonStart)
  if (jsonEnd < 0) throw new Error("Xiaohongshu initial state was incomplete.")

  try {
    return JSON.parse(normalizeInitialState(html.slice(jsonStart, jsonEnd)))
  } catch {
    throw new Error("Xiaohongshu initial state could not be parsed.")
  }
}

export function parseXiaohongshuCount(value: number | string | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (!value) return undefined
  const match = value.trim().match(/^([\d.]+)([万千]?)$/)
  if (!match) return undefined
  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return undefined
  const multiplier = match[2] === "万" ? 10_000 : match[2] === "千" ? 1_000 : 1
  return Math.round(amount * multiplier)
}

export function parseXiaohongshuNoteTimestamp(noteId: string | undefined): number | undefined {
  if (!noteId || !/^[0-9a-f]{24}$/i.test(noteId)) return undefined
  const timestamp = Number.parseInt(noteId.slice(0, 8), 16) * 1000
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : undefined
}

function normalizeImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  return value.startsWith("http://") ? `https://${value.slice(7)}` : value
}

function getCoverUrl(cover: XiaohongshuCover | undefined): string | undefined {
  return normalizeImageUrl(
    cover?.urlDefault
    ?? cover?.infoList?.find(image => image.imageScene === "WB_DFT")?.url
    ?? cover?.urlPre
    ?? cover?.url,
  )
}

export function xiaohongshuFeedItemToNewsItem(
  item: XiaohongshuFeedItem,
  xsecSource: "pc_search" | "pc_user",
): NewsItemInput | null {
  if (item.modelType && item.modelType !== "note") return null
  const card = item.noteCard
  const noteId = item.id ?? card?.noteId
  const title = card?.displayTitle?.trim()
  if (!noteId || !title) return null

  const xsecToken = item.xsecToken ?? card?.xsecToken
  const query = new URLSearchParams({ xsec_source: xsecSource })
  if (xsecToken) query.set("xsec_token", xsecToken)
  const authorName = card?.user?.nickname ?? card?.user?.nickName
  const authorId = card?.user?.userId

  return {
    title,
    url: `https://www.xiaohongshu.com/explore/${encodeURIComponent(noteId)}?${query}`,
    publishedAt: typeof card?.time === "number" ? card.time : parseXiaohongshuNoteTimestamp(noteId),
    author: {
      name: authorName,
      home: authorId
        ? `https://www.xiaohongshu.com/user/profile/${encodeURIComponent(authorId)}`
        : undefined,
    },
    icon: {
      kind: "author",
      label: authorName,
      src: normalizeImageUrl(card?.user?.avatar),
    },
    stats: {
      comments: parseXiaohongshuCount(card?.interactInfo?.commentCount),
      likes: parseXiaohongshuCount(card?.interactInfo?.likedCount),
      reposts: parseXiaohongshuCount(card?.interactInfo?.sharedCount),
      stars: parseXiaohongshuCount(card?.interactInfo?.collectedCount),
    },
    content: {
      pictures: getCoverUrl(card?.cover),
    },
  }
}
