import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import type { NewsItemInput, SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import type { IdentityParams } from "../shared/identity"
import { assertIdentity, identityParam } from "../shared/identity"
import {
  BILIBILI_WEB_LOCATION,
  bilibiliApiCapabilities,
  bilibiliAuthenticatedCapabilities,
  bilibiliIdentitySecret,
  bilibiliUserIdParam,
  compactBilibiliTitle,
  getBilibiliIdentity,
  normalizeBilibiliUrl,
  parseBilibiliCount,
  parseBilibiliDisplayDate,
  parseBilibiliTimestamp,
  readBilibiliUserId,
} from "./shared"

const FOLLOWING_DYNAMIC_FEED_URL = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all"
const USER_DYNAMIC_FEED_URL = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space"
const DYNAMIC_MAX_PAGES = 2
const DYNAMIC_RESULT_LIMIT = 30
const DYNAMIC_FEED_FEATURES = [
  "itemOpusStyle",
  "listOnlyfans",
  "opusBigCover",
  "onlyfansVote",
  "decorationCard",
  "onlyfansAssetsV2",
  "forwardListHidden",
  "ugcDelete",
  "onlyfansQaCard",
  "commentsNewVersion",
  "avatarAutoTheme",
  "sunflowerStyle",
  "cardsEnhance",
  "eva3CardOpus",
  "eva3CardVideo",
  "eva3CardComment",
  "eva3CardVote",
  "eva3CardUser",
]
const BILIBILI_FOLLOWING_ITEM_TEMPLATE = {
  inline: "{% unless scope.item.icon.kind == 'author' %}{% if scope.item.author %}{{ scope.item.author.name }}{% if scope.item.attributes.type %} · {% endif %}{% endif %}{% endunless %}{% if scope.item.attributes.type %}{{ scope.item.attributes.type }}{% endif %}",
} as const

interface DynamicFeedItem {
  id_str?: string
  orig?: DynamicFeedItem
  type?: string
  modules?: {
    module_author?: {
      face?: string
      jump_url?: string
      mid?: number
      name?: string
      pub_time?: string
      pub_ts?: number | string
    }
    module_dynamic?: {
      desc?: {
        text?: string
      } | null
      major?: {
        archive?: {
          bvid?: string
          cover?: string
          desc?: string
          jump_url?: string
          stat?: {
            play?: string
          }
          title?: string
        } | null
        article?: {
          covers?: string[]
          desc?: string
          jump_url?: string
          title?: string
        } | null
        opus?: {
          jump_url?: string
          pics?: Array<{ url?: string }>
          summary?: { text?: string }
          title?: string
        } | null
        pgc?: {
          badge?: {
            text?: string
          }
          cover?: string
          jump_url?: string
          stat?: {
            play?: string
          }
          title?: string
        } | null
        type?: string
      } | null
    }
    module_stat?: {
      comment?: { count?: number }
      forward?: { count?: number }
      like?: { count?: number }
    }
  }
}

interface DynamicFeedResponse {
  code: number
  message?: string
  data?: {
    has_more?: boolean
    items?: DynamicFeedItem[]
    offset?: string
  }
}

type BilibiliFollowingContent = "all" | "article" | "pgc" | "video"

const BILIBILI_FOLLOWING_CONTENT_LABELS: Record<BilibiliFollowingContent, string> = {
  all: "全部",
  article: "专栏",
  pgc: "追番追剧",
  video: "视频投稿",
}

const BILIBILI_FOLLOWING_DYNAMIC_TYPES = new Set([
  "DYNAMIC_TYPE_ARTICLE",
  "DYNAMIC_TYPE_AV",
  "DYNAMIC_TYPE_DRAW",
  "DYNAMIC_TYPE_FORWARD",
  "DYNAMIC_TYPE_WORD",
])

function getDynamicMajor(item: DynamicFeedItem) {
  return item.modules?.module_dynamic?.major
}

function getDynamicText(item: DynamicFeedItem): string | undefined {
  const dynamic = item.modules?.module_dynamic
  const major = dynamic?.major
  return dynamic?.desc?.text
    ?? major?.opus?.summary?.text
    ?? major?.article?.desc
    ?? major?.archive?.desc
    ?? major?.pgc?.title
}

function getDynamicPictures(item: DynamicFeedItem): string[] | string | undefined {
  const major = getDynamicMajor(item)
  const opusPictures = major?.opus?.pics
    ?.map(picture => picture.url)
    .filter((url): url is string => Boolean(url))
  if (opusPictures?.length) return opusPictures.map(normalizeBilibiliUrl)
  if (major?.article?.covers?.length) return major.article.covers.map(normalizeBilibiliUrl)
  if (major?.pgc?.cover) return normalizeBilibiliUrl(major.pgc.cover)
  return major?.archive?.cover ? normalizeBilibiliUrl(major.archive.cover) : undefined
}

function getDynamicType(item: DynamicFeedItem): string {
  if (item.type === "DYNAMIC_TYPE_FORWARD") return "转发"
  if (item.type === "DYNAMIC_TYPE_ARTICLE") return "专栏"
  if (item.type === "DYNAMIC_TYPE_AV") return "视频"
  if (item.type === "DYNAMIC_TYPE_DRAW") return "图文"
  if (item.type === "DYNAMIC_TYPE_WORD") return "文字"
  if (item.type === "DYNAMIC_TYPE_PGC_UNION") return getDynamicMajor(item)?.pgc?.badge?.text ?? "追番追剧"
  const majorType = getDynamicMajor(item)?.type
  if (majorType === "MAJOR_TYPE_ARCHIVE") return "视频"
  if (majorType === "MAJOR_TYPE_ARTICLE") return "专栏"
  return "动态"
}

function dynamicItemToNewsItem(item: DynamicFeedItem): NewsItemInput | null {
  const id = item.id_str?.trim()
  if (!id) return null

  const author = item.modules?.module_author
  const major = getDynamicMajor(item)
  const original = item.orig
  const originalMajor = original ? getDynamicMajor(original) : undefined
  const ownText = getDynamicText(item)
  const originalText = original ? getDynamicText(original) : undefined
  const titleSource = [
    major?.archive?.title,
    major?.opus?.title,
    major?.opus?.summary?.text,
    major?.article?.title,
    major?.pgc?.title,
    ownText,
    originalMajor?.archive?.title,
    originalMajor?.opus?.title,
    originalMajor?.opus?.summary?.text,
    originalMajor?.article?.title,
    originalMajor?.pgc?.title,
    originalText,
  ].find(value => value?.trim())
  const title = compactBilibiliTitle(titleSource)
  if (!title) return null
  const dynamicUrl = `https://www.bilibili.com/opus/${id}`
  const contentText = item.type === "DYNAMIC_TYPE_FORWARD" && originalText
    ? [ownText, originalText].filter(Boolean).join("\n\n")
    : ownText
  const stats = item.modules?.module_stat
  const url = item.type === "DYNAMIC_TYPE_FORWARD"
    ? dynamicUrl
    : major?.archive?.jump_url
      ?? major?.opus?.jump_url
      ?? major?.article?.jump_url
      ?? major?.pgc?.jump_url
      ?? dynamicUrl

  return {
    title,
    url: normalizeBilibiliUrl(url),
    publishedAt: parseBilibiliTimestamp(author?.pub_ts) ?? parseBilibiliDisplayDate(author?.pub_time),
    author: {
      name: author?.name,
      home: item.type === "DYNAMIC_TYPE_PGC_UNION" && author?.jump_url
        ? normalizeBilibiliUrl(author.jump_url)
        : author?.mid
          ? `https://space.bilibili.com/${author.mid}`
          : author?.jump_url,
    },
    icon: {
      kind: "author",
      label: author?.name,
      src: author?.face ? normalizeBilibiliUrl(author.face) : undefined,
    },
    stats: {
      likes: stats?.like?.count,
      comments: stats?.comment?.count,
      reposts: stats?.forward?.count,
      views: parseBilibiliCount(major?.pgc?.stat?.play ?? major?.archive?.stat?.play),
    },
    attributes: { type: getDynamicType(item) },
    content: {
      text: contentText,
      pictures: getDynamicPictures(item) ?? (original ? getDynamicPictures(original) : undefined),
    },
  }
}

export function followingDynamicItemsToNewsItems(
  items: DynamicFeedItem[],
  content: BilibiliFollowingContent,
): NewsItemInput[] {
  return dynamicItemsToNewsItems(items.filter((item) => {
    if (content === "pgc") return item.type === "DYNAMIC_TYPE_PGC_UNION"
    if (!item.type || !BILIBILI_FOLLOWING_DYNAMIC_TYPES.has(item.type)) return false
    if (content === "video") return item.type === "DYNAMIC_TYPE_AV"
    if (content === "article") return item.type !== "DYNAMIC_TYPE_AV"
    return true
  }))
}

export function dynamicItemsToNewsItems(items: DynamicFeedItem[]): NewsItemInput[] {
  return items
    .map(dynamicItemToNewsItem)
    .filter((item): item is NewsItemInput => item !== null)
    .sort((left, right) => (right.publishedAt ?? 0) - (left.publishedAt ?? 0))
}

async function fetchBilibiliDynamicItems(
  url: string,
  searchParams: Record<string, string | number>,
  context: SourceLoaderContext,
  errorMessage: string,
): Promise<DynamicFeedItem[]> {
  const dynamicItems: DynamicFeedItem[] = []
  let offset: string | undefined
  for (let page = 0; page < DYNAMIC_MAX_PAGES; page += 1) {
    const response = await context.fetch.get(url, {
      headers: {
        referer: "https://www.bilibili.com/",
      },
      searchParams: {
        ...searchParams,
        ...(offset ? { offset } : {}),
      },
    }).json<DynamicFeedResponse>()

    if (response.code !== 0) {
      throw new Error(response.message ?? errorMessage)
    }

    dynamicItems.push(...(response.data?.items ?? []))
    const nextOffset = response.data?.offset
    if (!response.data?.has_more || !nextOffset || nextOffset === offset) break
    offset = nextOffset
  }
  return dynamicItems
}

async function fetchBilibiliFollowing(
  { content, identity }: IdentityParams & { content: BilibiliFollowingContent },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const dynamicItems = await fetchBilibiliDynamicItems(
    FOLLOWING_DYNAMIC_FEED_URL,
    {
      "timezone_offset": -480,
      "type": content === "pgc" ? "pgc" : "all",
      "platform": "web",
      "page": 1,
      "features": DYNAMIC_FEED_FEATURES.join(","),
      "web_location": BILIBILI_WEB_LOCATION,
      "x-bili-device-req-json": JSON.stringify({
        platform: "web",
        device: "pc",
        spmid: BILIBILI_WEB_LOCATION,
      }),
    },
    context,
    "Failed to load Bilibili following dynamics.",
  )

  await assertIdentity(identity, () => getBilibiliIdentity(context), "Bilibili")

  return {
    items: followingDynamicItemsToNewsItems(dynamicItems, content).slice(0, DYNAMIC_RESULT_LIMIT),
    itemTemplate: BILIBILI_FOLLOWING_ITEM_TEMPLATE,
    metadata: {
      title: `动态 | ${BILIBILI_FOLLOWING_CONTENT_LABELS[content]}`,
    },
  }
}

async function fetchBilibiliUserDynamics(
  { mid }: { mid: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const dynamicItems = await fetchBilibiliDynamicItems(
    USER_DYNAMIC_FEED_URL,
    { host_mid: mid },
    context,
    "Failed to load Bilibili user dynamics.",
  )
  const author = dynamicItems
    .map(item => item.modules?.module_author)
    .find(item => String(item?.mid) === mid)

  return {
    items: dynamicItemsToNewsItems(dynamicItems)
      .slice(0, DYNAMIC_RESULT_LIMIT)
      .map(item => ({ ...item, icon: undefined })),
    itemTemplate: {
      inline: "{{ scope.item.attributes.type }}",
    },
    metadata: {
      title: author?.name ? `${author.name} | 动态` : "用户动态",
      badge: author?.face ? normalizeBilibiliUrl(author.face) : undefined,
      home: `https://space.bilibili.com/${mid}/dynamic`,
    },
  }
}

export const followingSource = {
  metadata: {
    title: "动态 | 全部",
    desc: "已关注 UP 主发布的最新动态",
  },
  params: {
    identity: identityParam,
    content: {
      type: "select",
      title: "内容",
      values: [
        { label: "全部", value: "all" },
        { label: "视频投稿", value: "video" },
        { label: "追番追剧", value: "pgc" },
        { label: "专栏", value: "article" },
      ],
      default: "all",
    },
  },
  radar: [
    {
      id: "bilibili-following",
      match: {
        hosts: ["t.bilibili.com"],
        paths: ["/"],
      },
      patch: {
        params: {
          identity: readBilibiliUserId,
          content: "{{ scope.query.tab }}",
        },
      },
    },
  ],
  loader: {
    type: "custom",
    load: fetchBilibiliFollowing,
  },
  secrets: [bilibiliIdentitySecret],
  capabilities: bilibiliAuthenticatedCapabilities,
} satisfies ProviderSourceConfig

export const userDynamicsSource = {
  metadata: {
    title: "用户动态",
    desc: "指定用户发布的动态",
  },
  params: {
    mid: bilibiliUserIdParam,
  },
  radar: [
    {
      id: "bilibili-user-dynamics",
      match: {
        hosts: ["space.bilibili.com"],
        paths: ["/:mid/dynamic"],
      },
      patch: {
        params: {
          mid: "{{ scope.path.mid }}",
        },
        metadata: {
          title: {
            select: ".nickname",
            template: "{{ scope.value }} | 动态",
          },
          home: "https://space.bilibili.com/{{ scope.params.mid | url_path }}/dynamic",
        },
      },
    },
  ],
  loader: {
    type: "custom",
    load: fetchBilibiliUserDynamics,
  },
  capabilities: bilibiliApiCapabilities,
} satisfies ProviderSourceConfig
