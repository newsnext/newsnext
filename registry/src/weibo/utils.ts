import type { NewsItemInput, SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import type { IdentityParams } from "../shared/identity"
import { load } from "cheerio/slim"
import { assertIdentity } from "../shared/identity"

const WEIBO_ORIGIN = "https://weibo.com"
const WEIBO_MOBILE_ORIGIN = "https://m.weibo.cn"

interface WeiboApiResponse<T> {
  ok?: number
  msg?: string
  url?: string
  data?: T
}

interface WeiboPicture {
  type?: string
  large?: {
    url?: string
  }
}

interface WeiboStatus {
  id?: string | number
  bid?: string
  mblogid?: string
  text?: string
  text_raw?: string
  created_at?: string
  source?: string
  isAd?: boolean
  user?: {
    id?: string | number
    screen_name?: string
    profile_image_url?: string
  }
  attitudes_count?: number
  comments_count?: number
  reposts_count?: number
  pics?: WeiboPicture[]
  pic_infos?: Record<string, WeiboPicture>
  retweeted_status?: WeiboStatus
  longText?: {
    longTextContent?: string
  }
}

interface WeiboCard {
  card_group?: WeiboCard[]
  mblog?: WeiboStatus
  profile_type_id?: string
}

interface WeiboContainerData {
  cards?: WeiboCard[]
}

async function fetchWeiboDesktop<T>(url: string, context: SourceLoaderContext): Promise<T> {
  return context.fetch.get(url, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  }).json<T>()
}

function htmlToText(html?: string): string {
  return html ? load(html).text().replace(/\s+/g, " ").trim() : ""
}

function normalizePictures(pictures?: WeiboStatus["pics"] | WeiboStatus["pic_infos"]): string[] {
  if (!pictures) return []
  const values = Array.isArray(pictures) ? pictures : Object.values(pictures)
  return values
    .filter(picture => picture.type !== "livephoto")
    .map(picture => picture.large?.url)
    .filter((url): url is string => Boolean(url))
}

function weiboStatusToNewsItem(
  status: WeiboStatus,
  includeIcon: boolean,
): NewsItemInput | undefined {
  const postId = status.mblogid || status.bid || (typeof status.id === "string" ? status.id : undefined)
  const text = status.text_raw?.trim() || htmlToText(status.longText?.longTextContent ?? status.text)
  if (!postId || !text) return undefined

  const userId = status.user?.id?.toString()
  const retweetedText = status.retweeted_status
    ? (
        status.retweeted_status.text_raw?.trim()
        || htmlToText(status.retweeted_status.longText?.longTextContent ?? status.retweeted_status.text)
      )
    : undefined
  const pictures = [
    ...normalizePictures(status.pic_infos ?? status.pics),
    ...normalizePictures(status.retweeted_status?.pic_infos ?? status.retweeted_status?.pics),
  ]
  const timestamp = status.created_at ? Date.parse(status.created_at) : Number.NaN
  const inlineIcon = includeIcon ? status.user?.profile_image_url : undefined
  const authorName = status.user?.screen_name
  return {
    title: text,
    url: userId ? `${WEIBO_ORIGIN}/${userId}/${postId}` : `${WEIBO_ORIGIN}/status/${postId}`,
    publishedAt: timestamp,
    author: {
      name: authorName,
      home: userId ? `${WEIBO_ORIGIN}/u/${userId}` : undefined,
    },
    stats: {
      likes: status.attitudes_count,
      comments: status.comments_count,
      reposts: status.reposts_count,
    },
    icon: {
      kind: "author",
      label: authorName,
      src: inlineIcon,
    },
    content: {
      text: retweetedText ? `${text}\n\nRepost: ${retweetedText}` : text,
      pictures,
    },
  }
}

function statusesToNewsItems(
  statuses: WeiboStatus[],
  options: { includeIcon?: boolean } = {},
): NewsItemInput[] {
  const { includeIcon = true } = options
  return statuses
    .filter(status => !status.isAd)
    .flatMap((status): NewsItemInput[] => {
      const item = weiboStatusToNewsItem(status, includeIcon)
      return item ? [item] : []
    })
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
}

function cardsToNewsItems(cards: WeiboCard[]): NewsItemInput[] {
  const statuses = cards
    .flatMap(card => [card, ...(card.card_group ?? [])])
    .filter(card => !card.profile_type_id?.startsWith("proweibotop"))
    .flatMap(card => card.mblog ? [card.mblog] : [])
  return statusesToNewsItems(statuses)
}

export function getWeiboResponseIdentity(headers: Headers): string | undefined {
  return headers.get("x-log-uid")?.trim() || undefined
}

export async function fetchWeiboUserPosts(
  { uid }: { uid: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const response = await fetchWeiboDesktop<WeiboApiResponse<{ list?: WeiboStatus[] }>>(
    `${WEIBO_ORIGIN}/ajax/statuses/mymblog?uid=${uid}&page=1&feature=0`,
    context,
  )
  if (!response.data) throw new Error(response.msg ?? "Weibo returned an empty user timeline.")
  const statuses = response.data.list ?? []
  const badge = statuses
    .find(status => status.user?.profile_image_url)
    ?.user
    ?.profile_image_url
  return {
    items: statusesToNewsItems(statuses, { includeIcon: false }),
    metadata: badge ? { badge } : undefined,
  }
}

export async function fetchWeiboKeywordPosts(
  { keyword }: { keyword: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const keywordValue = encodeURIComponent(keyword)
  const response = await context.fetch.get(
    `${WEIBO_MOBILE_ORIGIN}/api/container/getIndex?containerid=100103type%3D61%26q%3D${keywordValue}%26t%3D0`,
    {
      headers: {
        "MWeibo-Pwa": "1",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  ).json<WeiboApiResponse<WeiboContainerData>>()
  if (!response.data) throw new Error(response.msg ?? "Weibo returned an empty keyword timeline.")
  return { items: cardsToNewsItems(response.data.cards ?? []) }
}

export async function fetchWeiboSuperTopicPosts(
  { id }: { id: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const response = await fetchWeiboDesktop<{ items?: Array<{ category?: string, data?: WeiboStatus }> }>(
    `${WEIBO_ORIGIN}/ajax_proxy/chaohua/page?flowId=${id}_-_sort_time`,
    context,
  )
  return {
    items: statusesToNewsItems(
      (response.items ?? [])
        .flatMap(item => item.category === "feed" && item.data ? [item.data] : []),
    ),
  }
}

export async function fetchWeiboFollowingTimeline(
  { identity }: IdentityParams,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const listId = "my_follow_all"
  const searchParams = new URLSearchParams({
    list_id: listId,
    refresh: "4",
    since_id: "0",
    count: "25",
  })
  const request = await context.fetch.get(
    `${WEIBO_ORIGIN}/ajax/feed/friendstimeline?${searchParams}`,
    { headers: { "X-Requested-With": "XMLHttpRequest" } },
  )
  const response = await request.json<WeiboApiResponse<never> & { statuses?: WeiboStatus[] }>()
  if (response.ok === -100) {
    throw new Error("Please log in to https://weibo.com first.")
  }
  await assertIdentity(
    identity,
    () => getWeiboResponseIdentity(request.headers),
    "Weibo",
  )
  return { items: statusesToNewsItems(response.statuses ?? []) }
}
