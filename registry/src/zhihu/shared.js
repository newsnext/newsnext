import { fieldTransforms } from "@newsnext/source-kit/core"

export const ZHIHU_ORIGIN = "https://www.zhihu.com"
function contentId(value) {
  // Never construct an identity from an already-rounded API number.
  if (typeof value === "number")
    return Number.isSafeInteger(value) && value > 0 ? String(value) : undefined
  return typeof value === "string" && /^\d+$/.test(value) ? value : undefined
}
function pageUrl(value) {
  if (!value)
    return undefined
  try {
    const url = new URL(value, ZHIHU_ORIGIN)
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      return undefined
    const isContentPage = url.hostname === "zhuanlan.zhihu.com"
      ? /^\/p\/\d+(?:\/|$)/.test(url.pathname)
      : ["zhihu.com", "www.zhihu.com"].includes(url.hostname)
        && /^\/(?:question|answer|pin|zvideo)\/\d+(?:\/|$)/.test(url.pathname)
    return isContentPage ? url.href : undefined
  } catch {
    return undefined
  }
}
/** Prefer actual content pages; API URLs are resource identifiers, not click targets. */
export function resolveZhihuUrl(content) {
  const existing = pageUrl(content.url)
  if (existing)
    return existing
  const id = contentId(content.id)
  if (!id)
    return undefined
  switch (content.type) {
    case "answer": {
      const questionId = contentId(content.question?.id)
      return questionId ? `${ZHIHU_ORIGIN}/question/${questionId}/answer/${id}` : undefined
    }
    case "article": return `https://zhuanlan.zhihu.com/p/${id}`
    case "pin": return `${ZHIHU_ORIGIN}/pin/${id}`
    case "question": return `${ZHIHU_ORIGIN}/question/${id}`
    case "zvideo": return `${ZHIHU_ORIGIN}/zvideo/${id}`
    default: return undefined
  }
}
function cleanText(value, maxLength) {
  const text = fieldTransforms.normalize_whitespace(fieldTransforms.strip_html(value))
  return maxLength === undefined ? text : fieldTransforms.truncate(text, maxLength, "…")
}
function parseZhihuContent(content, feed) {
  const rawTitle = content.question?.title || content.title || content.excerpt_title || (feed ? content.excerpt : undefined)
  const title = feed ? cleanText(rawTitle, 160) : rawTitle
  const url = resolveZhihuUrl(content)
  if (!title || !url)
    return undefined
  const author = content.author
  const statistics = content.reaction?.statistics
  return {
    title,
    url,
    publishedAt: fieldTransforms.seconds_to_ms(feed ? feed.created_time : content.created_time ?? content.created),
    author: author?.name ? { name: author.name } : undefined,
    icon: author?.avatar_url ? { src: author.avatar_url, kind: "author", label: author.name } : undefined,
    stats: feed
      ? {
          score: statistics?.applaud_count ?? content.voteup_count ?? content.like_count,
          comments: statistics?.comment_count ?? content.comment_count,
          stars: statistics?.favorites ?? content.favorite_count ?? content.favlists_count,
          likes: statistics?.like_count,
        }
      : { score: content.voteup_count, comments: content.comment_count },
    attributes: feed?.action_text ? { activity: feed.action_text } : undefined,
    content: {
      text: feed ? cleanText(content.excerpt || content.excerpt_title) : content.excerpt,
      pictures: content.image_url,
    },
  }
}
export function parseZhihuColumn(response) {
  return (response.data ?? []).flatMap((content) => {
    const item = parseZhihuContent(content)
    return item ? [item] : []
  })
}
export function parseZhihuFollowing(response) {
  const data = response.data ?? []
  // Preserve the existing loader's ordering: ordinary feeds, then grouped feeds.
  const feeds = [
    ...data.filter(feed => feed.type === "feed"),
    ...data.filter(feed => feed.type === "feed_group").flatMap(feed => feed.list ?? []),
  ]
  return feeds.flatMap((feed) => {
    if (!feed.target)
      return []
    const item = parseZhihuContent(feed.target, feed)
    return item ? [item] : []
  })
}
