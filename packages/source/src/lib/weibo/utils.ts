import type { NewsItem, SourceLoaderContext, SourceSecretDefinition } from "@newsnext/source/typings"
import { myFetch } from "@newsnext/source/utils/fetch"
import { load } from "cheerio/slim"

const WEIBO_ORIGIN = "https://m.weibo.cn"
const WEIBO_SUB_SECRET_KEY = "sub"
const WEIBO_SUBP_SECRET_KEY = "subp"
const WEIBO_LOGIN_STATE_SECRET_KEY = "ssoLoginState"

const WEIBO_HEADERS = {
  "MWeibo-Pwa": "1",
  "X-Requested-With": "XMLHttpRequest",
}

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

interface WeiboTab {
  tab_type?: string
  containerid?: string
}

interface WeiboUserInfo {
  id?: string | number
  screen_name?: string
  description?: string
  profile_image_url?: string
  avatar_hd?: string
}

interface WeiboContainerData {
  userInfo?: WeiboUserInfo
  tabsInfo?: {
    tabs?: WeiboTab[]
  }
  cards?: WeiboCard[]
  pageInfo?: {
    page_title?: string
  }
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
  user?: WeiboUserInfo
  pics?: WeiboPicture[] | Record<string, WeiboPicture>
  pic_ids?: string[]
  retweeted_status?: WeiboStatus
  longText?: {
    longTextContent?: string
  }
  isLongText?: boolean
}

interface WeiboCard {
  card_type?: number | string
  card_group?: WeiboCard[]
  mblog?: WeiboStatus
  profile_type_id?: string
}

interface WeiboFriendsData {
  statuses?: WeiboStatus[]
}

interface WeiboConfigData {
  uid?: string | number
}

export interface WeiboUserPostsParams {
  uid: string
}

export interface WeiboKeywordPostsParams {
  keyword: string
}

const WEIBO_SUPER_TOPIC_TYPE_OPTIONS = [
  "feed",
  "sort_time",
  "hot_sort",
  "soul",
] as const

type WeiboSuperTopicType = (typeof WEIBO_SUPER_TOPIC_TYPE_OPTIONS)[number]

export interface WeiboSuperTopicPostsParams {
  id: string
  type: WeiboSuperTopicType
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

function createHeaders(referer: string, context?: SourceLoaderContext): Record<string, string> {
  const cookie = createCookieHeader(context)

  return {
    ...WEIBO_HEADERS,
    Referer: referer,
    ...(cookie ? { Cookie: cookie } : {}),
  }
}

async function fetchWeiboApi<T>(url: string, referer: string, context?: SourceLoaderContext): Promise<T> {
  const response = await myFetch<WeiboApiResponse<T>>(url, {
    headers: createHeaders(referer, context),
    credentials: "include",
  })

  if (response.ok === -100) {
    throw new Error(response.msg ?? "Weibo login is required.")
  }

  if (!response.data) {
    throw new Error(response.msg ?? "Weibo returned an empty response.")
  }

  return response.data
}

function isWeiboSuperTopicType(value: string): value is WeiboSuperTopicType {
  return WEIBO_SUPER_TOPIC_TYPE_OPTIONS.includes(value as WeiboSuperTopicType)
}

function htmlToText(html?: string): string {
  if (!html) {
    return ""
  }

  return load(html).text().replace(/\s+/g, " ").trim()
}

function normalizePictures(pictures?: WeiboStatus["pics"]): string[] {
  if (!pictures) {
    return []
  }

  const values = Array.isArray(pictures) ? pictures : Object.values(pictures)
  return values
    .filter(picture => picture.type !== "livephoto")
    .map(picture => picture.large?.url ?? picture.url)
    .filter((url): url is string => Boolean(url))
}

function parseWeiboTimestamp(createdAt?: string): number | undefined {
  if (!createdAt) {
    return undefined
  }

  const timestamp = new Date(createdAt).getTime()
  return Number.isNaN(timestamp) ? undefined : timestamp
}

function getStatusBid(status: WeiboStatus): string | undefined {
  return status.bid || status.mblogid || (typeof status.id === "string" ? status.id : undefined)
}

function weiboStatusToNewsItem(status: WeiboStatus): NewsItem | undefined {
  const bid = getStatusBid(status)
  const userId = status.user?.id?.toString()
  const textHtml = status.longText?.longTextContent ?? status.text
  const text = htmlToText(textHtml)

  if (!bid || !text) {
    return undefined
  }

  const url = userId
    ? `https://m.weibo.cn/${userId}/${bid}`
    : `${WEIBO_ORIGIN}/status/${bid}`
  const retweetedText = status.retweeted_status
    ? htmlToText(status.retweeted_status.longText?.longTextContent ?? status.retweeted_status.text)
    : undefined
  const previewText = retweetedText ? `${text}\n\nRepost: ${retweetedText}` : text
  const pictures = [
    ...normalizePictures(status.pics),
    ...normalizePictures(status.retweeted_status?.pics),
  ]

  const item: NewsItem = {
    title: text,
    url,
    mobileUrl: `${WEIBO_ORIGIN}/status/${bid}`,
    timestamp: parseWeiboTimestamp(status.created_at),
    inline: {
      text: status.source ? htmlToText(status.source) : "",
      ...(status.user?.profile_image_url ? { icon: { src: status.user.profile_image_url, radius: 999 } } : {}),
    },
    preview: {
      text: previewText,
      ...(pictures.length ? { picture: pictures } : {}),
    },
  }

  return item
}

function sortNewsItemsByNewest(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
}

function cardsToNewsItems(cards: WeiboCard[]): NewsItem[] {
  return sortNewsItemsByNewest(
    cards
      .flatMap(card => [card, ...(card.card_group ?? [])])
      .filter(card => !card.profile_type_id?.startsWith("proweibotop"))
      .map(card => card.mblog ? weiboStatusToNewsItem(card.mblog) : undefined)
      .filter((item): item is NewsItem => item !== undefined),
  )
}

export async function fetchWeiboUserPosts(
  { uid }: WeiboUserPostsParams,
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const normalizedUid = uid.trim()
  if (!/^\d+$/.test(normalizedUid)) {
    throw new Error("Weibo user ID must be a numeric uid.")
  }

  const userUrl = `${WEIBO_ORIGIN}/u/${normalizedUid}`
  const containerData = await fetchWeiboApi<WeiboContainerData>(
    `${WEIBO_ORIGIN}/api/container/getIndex?type=uid&value=${normalizedUid}`,
    userUrl,
    context,
  )
  const containerId = containerData.tabsInfo?.tabs?.find(tab => tab.tab_type === "weibo")?.containerid

  if (!containerId) {
    throw new Error(`Cannot find Weibo timeline container for uid ${normalizedUid}.`)
  }

  const timelineData = await fetchWeiboApi<WeiboContainerData>(
    `${WEIBO_ORIGIN}/api/container/getIndex?type=uid&value=${normalizedUid}&containerid=${containerId}`,
    userUrl,
    context,
  )

  return cardsToNewsItems(timelineData.cards ?? [])
}

export async function fetchWeiboKeywordPosts(
  { keyword }: WeiboKeywordPostsParams,
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) {
    throw new Error("Weibo keyword must not be empty.")
  }

  const encodedKeyword = encodeURIComponent(normalizedKeyword)
  const searchData = await fetchWeiboApi<WeiboContainerData>(
    `${WEIBO_ORIGIN}/api/container/getIndex?containerid=100103type%3D61%26q%3D${encodedKeyword}%26t%3D0`,
    `${WEIBO_ORIGIN}/p/searchall?containerid=100103type%3D1%26q%3D${encodedKeyword}`,
    context,
  )

  return cardsToNewsItems(searchData.cards ?? [])
}

export async function fetchWeiboSuperTopicPosts(
  { id, type }: WeiboSuperTopicPostsParams,
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const normalizedId = id.trim()
  if (!/^100808[a-z\d]+$/i.test(normalizedId)) {
    throw new Error("Weibo super topic ID must start with 100808 and contain only letters or digits.")
  }

  const normalizedType = isWeiboSuperTopicType(type) ? type : "feed"
  const searchParams = new URLSearchParams({
    containerid: `${normalizedId}_-_${normalizedType}`,
    luicode: "10000011",
    lfid: `${normalizedId}_-_main`,
  })
  const topicData = await fetchWeiboApi<WeiboContainerData>(
    `${WEIBO_ORIGIN}/api/container/getIndex?${searchParams}`,
    `${WEIBO_ORIGIN}/p/index?containerid=${normalizedId}_-_soul&luicode=10000011&lfid=${normalizedId}_-_main`,
    context,
  )

  return cardsToNewsItems(topicData.cards ?? [])
}

export async function fetchWeiboFollowingTimeline(
  _params: Record<string, unknown>,
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const configData = await fetchWeiboApi<WeiboConfigData>(
    `${WEIBO_ORIGIN}/api/config`,
    `${WEIBO_ORIGIN}/`,
    context,
  )
  const uid = configData.uid?.toString()
  const referer = uid ? `${WEIBO_ORIGIN}/u/${uid}` : `${WEIBO_ORIGIN}/`
  const friendsData = await fetchWeiboApi<WeiboFriendsData>(
    `${WEIBO_ORIGIN}/feed/friends`,
    referer,
    context,
  )

  return sortNewsItemsByNewest(
    (friendsData.statuses ?? [])
      .map(weiboStatusToNewsItem)
      .filter((item): item is NewsItem => item !== undefined),
  )
}
