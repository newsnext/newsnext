import type { NewsItem, SourceLoaderContext, SourceSecretDefinition } from "@newsnext/source/typings"
import { myFetch } from "@newsnext/source/utils/fetch"
import { load } from "cheerio/slim"

const WEIBO_ORIGIN = "https://m.weibo.cn"
const WEIBO_SUB_SECRET_KEY = "sub"
const WEIBO_SUBP_SECRET_KEY = "subp"
const WEIBO_LOGIN_STATE_SECRET_KEY = "ssoLoginState"

export const optionalWeiboCookieSecrets: SourceSecretDefinition[] = [
  {
    key: WEIBO_SUB_SECRET_KEY,
    type: "cookie",
    origin: WEIBO_ORIGIN,
    itemKey: "SUB",
    required: false,
  },
  {
    key: WEIBO_SUBP_SECRET_KEY,
    type: "cookie",
    origin: WEIBO_ORIGIN,
    itemKey: "SUBP",
    required: false,
  },
  {
    key: WEIBO_LOGIN_STATE_SECRET_KEY,
    type: "cookie",
    origin: WEIBO_ORIGIN,
    itemKey: "SSOLoginState",
    required: false,
  },
]

export const requiredWeiboCookieSecrets: SourceSecretDefinition[] = optionalWeiboCookieSecrets.map(secret => ({
  ...secret,
  required: secret.key === WEIBO_SUB_SECRET_KEY,
}))

interface WeiboApiResponse<T> {
  ok?: number
  msg?: string
  data?: T
}

interface WeiboPicture {
  type?: string
  large?: {
    url?: string
  }
  url?: string
}

interface WeiboStatus {
  id?: string | number
  bid?: string
  mblogid?: string
  text?: string
  created_at?: string
  source?: string
  user?: {
    id?: string | number
    profile_image_url?: string
  }
  pics?: WeiboPicture[] | Record<string, WeiboPicture>
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
  tabsInfo?: {
    tabs?: Array<{
      tab_type?: string
      containerid?: string
    }>
  }
  cards?: WeiboCard[]
}

function createCookieHeader(context?: SourceLoaderContext): string | undefined {
  const entries = [
    ["SUB", context?.secrets?.[WEIBO_SUB_SECRET_KEY]],
    ["SUBP", context?.secrets?.[WEIBO_SUBP_SECRET_KEY]],
    ["SSOLoginState", context?.secrets?.[WEIBO_LOGIN_STATE_SECRET_KEY]],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
    .map(([key, value]) => `${key}=${value}`)
  return entries.length ? entries.join("; ") : undefined
}

async function fetchWeiboApi<T>(
  url: string,
  referer: string,
  context?: SourceLoaderContext,
): Promise<T> {
  const cookie = createCookieHeader(context)
  const response = await myFetch<WeiboApiResponse<T>>(url, {
    headers: {
      "MWeibo-Pwa": "1",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": referer,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    credentials: "include",
  })
  if (response.ok === -100) throw new Error(response.msg ?? "Weibo login is required.")
  if (!response.data) throw new Error(response.msg ?? "Weibo returned an empty response.")
  return response.data
}

function htmlToText(html?: string): string {
  return html ? load(html).text().replace(/\s+/g, " ").trim() : ""
}

function normalizePictures(pictures?: WeiboStatus["pics"]): string[] {
  if (!pictures) return []
  const values = Array.isArray(pictures) ? pictures : Object.values(pictures)
  return values
    .filter(picture => picture.type !== "livephoto")
    .map(picture => picture.large?.url ?? picture.url)
    .filter((url): url is string => Boolean(url))
}

function weiboStatusToNewsItem(status: WeiboStatus): NewsItem | undefined {
  const bid = status.bid || status.mblogid || (typeof status.id === "string" ? status.id : undefined)
  const text = htmlToText(status.longText?.longTextContent ?? status.text)
  if (!bid || !text) return undefined

  const userId = status.user?.id?.toString()
  const retweetedText = status.retweeted_status
    ? htmlToText(status.retweeted_status.longText?.longTextContent ?? status.retweeted_status.text)
    : undefined
  const pictures = [
    ...normalizePictures(status.pics),
    ...normalizePictures(status.retweeted_status?.pics),
  ]
  const timestamp = status.created_at ? Date.parse(status.created_at) : Number.NaN
  const item: NewsItem = {
    title: text,
    url: userId ? `${WEIBO_ORIGIN}/${userId}/${bid}` : `${WEIBO_ORIGIN}/status/${bid}`,
    mobileUrl: `${WEIBO_ORIGIN}/status/${bid}`,
    inline: {
      text: status.source ? htmlToText(status.source) : "",
      ...(status.user?.profile_image_url
        ? { icon: { src: status.user.profile_image_url, radius: 999 } }
        : {}),
    },
    preview: {
      text: retweetedText ? `${text}\n\nRepost: ${retweetedText}` : text,
      ...(pictures.length ? { picture: pictures } : {}),
    },
  }
  if (!Number.isNaN(timestamp)) item.timestamp = timestamp
  return item
}

function cardsToNewsItems(cards: WeiboCard[]): NewsItem[] {
  return cards
    .flatMap(card => [card, ...(card.card_group ?? [])])
    .filter(card => !card.profile_type_id?.startsWith("proweibotop"))
    .flatMap((card): NewsItem[] => {
      const item = card.mblog ? weiboStatusToNewsItem(card.mblog) : undefined
      return item ? [item] : []
    })
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
}

export async function fetchWeiboUserPosts(
  { uid }: { uid: string },
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const normalizedUid = uid.trim()
  if (!/^\d+$/.test(normalizedUid)) throw new Error("Weibo user ID must be a numeric uid.")

  const userUrl = `${WEIBO_ORIGIN}/u/${normalizedUid}`
  const containerData = await fetchWeiboApi<WeiboContainerData>(
    `${WEIBO_ORIGIN}/api/container/getIndex?type=uid&value=${normalizedUid}`,
    userUrl,
    context,
  )
  const containerId = containerData.tabsInfo?.tabs?.find(tab => tab.tab_type === "weibo")?.containerid
  if (!containerId) throw new Error(`Cannot find Weibo timeline container for uid ${normalizedUid}.`)

  const timelineData = await fetchWeiboApi<WeiboContainerData>(
    `${WEIBO_ORIGIN}/api/container/getIndex?type=uid&value=${normalizedUid}&containerid=${containerId}`,
    userUrl,
    context,
  )
  return cardsToNewsItems(timelineData.cards ?? [])
}

export async function fetchWeiboKeywordPosts(
  { keyword }: { keyword: string },
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) throw new Error("Weibo keyword must not be empty.")

  const keywordValue = encodeURIComponent(normalizedKeyword)
  const data = await fetchWeiboApi<WeiboContainerData>(
    `${WEIBO_ORIGIN}/api/container/getIndex?containerid=100103type%3D61%26q%3D${keywordValue}%26t%3D0`,
    `${WEIBO_ORIGIN}/p/searchall?containerid=100103type%3D1%26q%3D${keywordValue}`,
    context,
  )
  return cardsToNewsItems(data.cards ?? [])
}

const WEIBO_SUPER_TOPIC_TYPES = ["feed", "sort_time", "hot_sort", "soul"]

export async function fetchWeiboSuperTopicPosts(
  { id, type }: { id: string, type: string },
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const normalizedId = id.trim()
  if (!/^100808[a-z\d]+$/i.test(normalizedId)) {
    throw new Error("Weibo super topic ID must start with 100808 and contain only letters or digits.")
  }
  const normalizedType = WEIBO_SUPER_TOPIC_TYPES.includes(type) ? type : "feed"
  const searchParams = new URLSearchParams({
    containerid: `${normalizedId}_-_${normalizedType}`,
    luicode: "10000011",
    lfid: `${normalizedId}_-_main`,
  })
  const data = await fetchWeiboApi<WeiboContainerData>(
    `${WEIBO_ORIGIN}/api/container/getIndex?${searchParams}`,
    `${WEIBO_ORIGIN}/p/index?containerid=${normalizedId}_-_soul&luicode=10000011&lfid=${normalizedId}_-_main`,
    context,
  )
  return cardsToNewsItems(data.cards ?? [])
}

export async function fetchWeiboFollowingTimeline(
  _params: Record<string, unknown>,
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const config = await fetchWeiboApi<{ uid?: string | number }>(
    `${WEIBO_ORIGIN}/api/config`,
    `${WEIBO_ORIGIN}/`,
    context,
  )
  const uid = config.uid?.toString()
  const data = await fetchWeiboApi<{ statuses?: WeiboStatus[] }>(
    `${WEIBO_ORIGIN}/feed/friends`,
    uid ? `${WEIBO_ORIGIN}/u/${uid}` : `${WEIBO_ORIGIN}/`,
    context,
  )
  return (data.statuses ?? [])
    .flatMap((status): NewsItem[] => {
      const item = weiboStatusToNewsItem(status)
      return item ? [item] : []
    })
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
}
