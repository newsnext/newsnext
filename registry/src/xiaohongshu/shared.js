import { fieldTransforms } from "@newsnext/sdk/source"

const INITIAL_STATE_MARKER = "window.__INITIAL_STATE__="
const SCRIPT_END = "</script>"
function normalizeInitialState(value) {
  return value
    .replace(/\bundefined\b/g, "null")
    .replace(/new Map\(\[\]\)/g, "[]")
    .replace(/new Set\(\[\]\)/g, "[]")
}
export function parseXiaohongshuInitialState(html) {
  const markerIndex = html.indexOf(INITIAL_STATE_MARKER)
  if (markerIndex < 0)
    throw new Error("Xiaohongshu page did not contain initial state.")
  const jsonStart = markerIndex + INITIAL_STATE_MARKER.length
  const jsonEnd = html.indexOf(SCRIPT_END, jsonStart)
  if (jsonEnd < 0)
    throw new Error("Xiaohongshu initial state was incomplete.")
  try {
    return JSON.parse(normalizeInitialState(html.slice(jsonStart, jsonEnd)))
  } catch {
    throw new Error("Xiaohongshu initial state could not be parsed.")
  }
}
export function parseXiaohongshuCount(value) {
  const count = fieldTransforms.parse_compact_number(value)
  if (count === undefined)
    return undefined
  return typeof value === "number" ? count : Math.round(count)
}
export function parseXiaohongshuNoteTimestamp(noteId) {
  if (!noteId || !/^[0-9a-f]{24}$/i.test(noteId))
    return undefined
  const timestamp = Number.parseInt(noteId.slice(0, 8), 16) * 1000
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : undefined
}
export function sortXiaohongshuItemsByNewest(items) {
  return items.sort((left, right) => (right.publishedAt ?? 0) - (left.publishedAt ?? 0))
}
function normalizeImageUrl(value) {
  if (!value)
    return undefined
  return value.startsWith("http://") ? `https://${value.slice(7)}` : value
}
function getCoverUrl(cover) {
  return normalizeImageUrl(cover?.urlDefault
    ?? cover?.infoList?.find(image => image.imageScene === "WB_DFT")?.url
    ?? cover?.urlPre
    ?? cover?.url)
}
export function xiaohongshuFeedItemToNewsItem(item, xsecSource) {
  if (item.modelType && item.modelType !== "note")
    return null
  const card = item.noteCard
  const noteId = item.id ?? card?.noteId
  const title = card?.displayTitle?.trim()
  if (!noteId || !title)
    return null
  const xsecToken = item.xsecToken ?? card?.xsecToken
  const query = new URLSearchParams({ xsec_source: xsecSource })
  if (xsecToken)
    query.set("xsec_token", xsecToken)
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
