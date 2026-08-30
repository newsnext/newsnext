import type { NewsItemInput, SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import { load } from "cheerio/slim"
import { requestXueqiuJson } from "./shared"

const XUEQIU_API_ORIGIN = "https://api.xueqiu.com"

interface XueqiuUser {
  profile?: string
  screen_name?: string
}

interface XueqiuStatus {
  created_at?: number
  description?: string
  firstImg?: string
  like_count?: number
  reply_count?: number
  retweet_count?: number
  target?: string
  text?: string
  title?: string
  user?: XueqiuUser
  view_count?: number
}

interface XueqiuStatusResponse {
  list?: XueqiuStatus[]
}

interface StockDiscussionParams {
  sort: "latest" | "hot"
  symbol: string
}

interface StockTimelineParams {
  symbol: string
}

function htmlToText(html?: string): string {
  return html ? load(html).text().replace(/\s+/g, " ").trim() : ""
}

function truncate(value: string, length = 120): string {
  return value.length > length ? `${value.slice(0, length)}…` : value
}

function statusTitle(status: XueqiuStatus): string {
  return truncate(htmlToText(status.title || status.description || status.text))
}

function discussionToNewsItem(status: XueqiuStatus): NewsItemInput | undefined {
  const title = statusTitle(status)
  if (!status.target || !title) return undefined

  return {
    url: status.target,
    title,
    publishedAt: status.created_at,
    author: status.user?.screen_name
      ? {
          name: status.user.screen_name,
          home: status.user.profile,
        }
      : undefined,
    stats: {
      likes: status.like_count,
      comments: status.reply_count,
      reposts: status.retweet_count,
      views: status.view_count,
    },
    content: {
      text: htmlToText(status.description || status.text),
      pictures: status.firstImg,
    },
  }
}

function timelineToNewsItem(status: XueqiuStatus): NewsItemInput | undefined {
  const title = truncate(
    htmlToText(status.title || status.description || status.text).replace(/网页链接\s*$/, "").trim(),
  )
  if (!status.target || !title) return undefined

  return {
    url: status.target,
    title,
    publishedAt: status.created_at,
    content: {
      html: status.description,
      pictures: status.firstImg,
    },
  }
}

async function fetchJson<T>(url: string, context: SourceLoaderContext): Promise<T> {
  const response = await requestXueqiuJson({
    url,
    fetch: context.fetch,
    signal: context.signal,
  })
  return await response.json() as T
}

export async function fetchStockDiscussions(
  { symbol, sort }: StockDiscussionParams,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const searchParams = new URLSearchParams({
    count: "20",
    comment: "0",
    symbol,
    hl: "0",
    source: "user",
    sort: sort === "hot" ? "alpha" : "time",
    page: "1",
    q: "",
  })
  const response = await fetchJson<XueqiuStatusResponse>(
    `${XUEQIU_API_ORIGIN}/query/v1/symbol/search/status.json?${searchParams}`,
    context,
  )

  return {
    items: (response.list ?? []).flatMap((status) => {
      const item = discussionToNewsItem(status)
      return item ? [item] : []
    }),
    metadata: {
      home: `https://xueqiu.com/S/${encodeURIComponent(symbol)}`,
      ...(sort === "hot" ? { type: "ranking" as const } : {}),
    },
  }
}

async function fetchStockTimeline(
  { symbol }: StockTimelineParams,
  context: SourceLoaderContext,
  source: string,
): Promise<SourceLoaderOutput> {
  const searchParams = new URLSearchParams({
    symbol_id: symbol,
    count: "20",
    source,
    page: "1",
  })
  const response = await fetchJson<XueqiuStatusResponse>(
    `${XUEQIU_API_ORIGIN}/statuses/stock_timeline.json?${searchParams}`,
    context,
  )

  return {
    items: (response.list ?? []).flatMap((status) => {
      const item = timelineToNewsItem(status)
      return item ? [item] : []
    }),
    metadata: {
      home: `https://xueqiu.com/S/${encodeURIComponent(symbol)}`,
    },
  }
}

export function fetchStockNews(
  params: StockTimelineParams,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  return fetchStockTimeline(params, context, "自选股新闻")
}

export function fetchStockAnnouncements(
  params: StockTimelineParams,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  return fetchStockTimeline(params, context, "公告")
}
