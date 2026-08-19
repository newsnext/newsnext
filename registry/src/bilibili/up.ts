import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import type { NewsItemInput, SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import {
  bilibiliApiCapabilities,
  compactBilibiliTitle,
  normalizeBilibiliUrl,
  parseBilibiliCount,
  parseBilibiliDisplayDate,
  parseBilibiliNumericCount,
  parseBilibiliOpusTimestamp,
  parseBilibiliTimestamp,
} from "./shared"
import { getBilibiliWbiKeys, signBilibiliWbiParams } from "./wbi"

const UP_VIDEO_URL = "https://api.bilibili.com/x/space/wbi/arc/search"
const UP_OPUS_URL = "https://api.bilibili.com/x/polymer/web-dynamic/v1/opus/feed/space"
const UP_AUDIO_URL = "https://api.bilibili.com/audio/music-service/web/song/upper"
const UP_OPUS_MAX_PAGES = 2
const UP_RESULT_LIMIT = 30

type BilibiliUpVideoOrder = "click" | "pubdate" | "stow"

const BILIBILI_UP_VIDEO_ORDER_LABELS: Record<BilibiliUpVideoOrder, string> = {
  click: "最多播放",
  pubdate: "最新发布",
  stow: "最多收藏",
}

interface BilibiliUpVideoItem {
  author?: string
  bvid?: string
  comment?: number
  created?: number
  description?: string
  mid?: number
  pic?: string
  play?: number | string
  title?: string
}

interface BilibiliUpVideoResponse {
  code: number
  data?: {
    list?: {
      vlist?: BilibiliUpVideoItem[]
    }
  }
  message?: string
}

interface BilibiliUpOpusItem {
  author?: {
    face?: string
    mid?: number
    name?: string
  } | null
  content?: string
  cover?: {
    url?: string
  } | null
  jump_url?: string
  opus_id?: string
  pub_time?: string
  stat?: {
    like?: string
    view?: string
  }
}

interface BilibiliUpOpusResponse {
  code: number
  data?: {
    has_more?: boolean
    items?: BilibiliUpOpusItem[]
    offset?: string
  }
  message?: string
}

interface BilibiliUpAudioItem {
  cover?: string
  id?: number
  intro?: string
  passtime?: number
  statistic?: {
    collect?: number
    comment?: number
    play?: number
    share?: number
  }
  title?: string
  uid?: number
  uname?: string
}

interface BilibiliUpAudioResponse {
  code: number
  data?: {
    data?: BilibiliUpAudioItem[]
  }
  message?: string
  msg?: string
}

export function upVideoItemToNewsItem(item: BilibiliUpVideoItem): NewsItemInput | null {
  if (!item.title || !item.bvid) return null

  return {
    title: item.title,
    url: `https://www.bilibili.com/video/${item.bvid}`,
    publishedAt: parseBilibiliTimestamp(item.created),
    author: {
      name: item.author,
      home: item.mid ? `https://space.bilibili.com/${item.mid}` : undefined,
    },
    stats: {
      comments: item.comment,
      views: parseBilibiliNumericCount(item.play),
    },
    content: {
      text: item.description,
      pictures: item.pic ? normalizeBilibiliUrl(item.pic) : undefined,
    },
  }
}

export function upOpusItemToNewsItem(item: BilibiliUpOpusItem): NewsItemInput | null {
  const id = item.opus_id?.trim()
  const title = compactBilibiliTitle(item.content)
  if (!id || !title) return null

  return {
    title,
    url: normalizeBilibiliUrl(item.jump_url ?? `https://www.bilibili.com/opus/${id}`),
    publishedAt: parseBilibiliDisplayDate(item.pub_time) ?? parseBilibiliOpusTimestamp(id),
    author: {
      name: item.author?.name,
      home: item.author?.mid ? `https://space.bilibili.com/${item.author.mid}` : undefined,
    },
    icon: {
      kind: "author",
      label: item.author?.name,
      src: item.author?.face ? normalizeBilibiliUrl(item.author.face) : undefined,
    },
    stats: {
      likes: parseBilibiliCount(item.stat?.like),
      views: parseBilibiliCount(item.stat?.view),
    },
    content: {
      text: item.content,
      pictures: item.cover?.url ? normalizeBilibiliUrl(item.cover.url) : undefined,
    },
  }
}

export function upAudioItemToNewsItem(item: BilibiliUpAudioItem): NewsItemInput | null {
  if (!item.id || !item.title) return null

  return {
    title: item.title,
    url: `https://www.bilibili.com/audio/au${item.id}`,
    publishedAt: parseBilibiliTimestamp(item.passtime),
    author: {
      name: item.uname,
      home: item.uid ? `https://space.bilibili.com/${item.uid}` : undefined,
    },
    stats: {
      comments: item.statistic?.comment,
      reposts: item.statistic?.share,
      stars: item.statistic?.collect,
      views: item.statistic?.play,
    },
    content: {
      text: item.intro,
      pictures: item.cover ? normalizeBilibiliUrl(item.cover) : undefined,
    },
  }
}

function normalizeBilibiliUpId(mid: string): string {
  const normalizedMid = mid.trim()
  if (!/^\d+$/.test(normalizedMid)) throw new Error("Bilibili UP ID must contain only digits.")
  return normalizedMid
}

async function fetchBilibiliUpVideo(
  { mid, order }: { mid: string, order: BilibiliUpVideoOrder },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const normalizedMid = normalizeBilibiliUpId(mid)
  const { imgUrl, subUrl } = await getBilibiliWbiKeys(context)

  const searchParams = await signBilibiliWbiParams({
    mid: normalizedMid,
    order,
    pn: 1,
    ps: UP_RESULT_LIMIT,
    tid: 0,
  }, imgUrl, subUrl)
  const response = await context.fetch.get(UP_VIDEO_URL, {
    headers: { referer: `https://space.bilibili.com/${normalizedMid}/upload/video` },
    searchParams,
  }).json<BilibiliUpVideoResponse>()
  if (response.code !== 0) {
    throw new Error(response.message ?? "Failed to load Bilibili UP videos.")
  }

  const videos = response.data?.list?.vlist ?? []
  const authorName = videos
    .find(item => String(item.mid) === normalizedMid && item.author?.trim())
    ?.author
    ?.trim()
    ?? videos.find(item => item.author?.trim())?.author?.trim()
  return {
    items: videos
      .map(upVideoItemToNewsItem)
      .filter((item): item is NewsItemInput => item !== null),
    metadata: {
      title: `${authorName ?? "UP 主视频"}｜${BILIBILI_UP_VIDEO_ORDER_LABELS[order]}`,
      home: `https://space.bilibili.com/${normalizedMid}/upload/video`,
    },
  }
}

async function fetchBilibiliUpOpus(
  { mid }: { mid: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const normalizedMid = normalizeBilibiliUpId(mid)
  const opusItems: BilibiliUpOpusItem[] = []
  let offset: string | undefined

  for (let page = 1; page <= UP_OPUS_MAX_PAGES && opusItems.length < UP_RESULT_LIMIT; page += 1) {
    const response = await context.fetch.get(UP_OPUS_URL, {
      headers: { referer: `https://space.bilibili.com/${normalizedMid}/upload/opus` },
      searchParams: {
        host_mid: normalizedMid,
        page,
        offset: offset ?? "",
        type: "all",
      },
    }).json<BilibiliUpOpusResponse>()

    if (response.code !== 0) {
      throw new Error(response.message ?? "Failed to load Bilibili UP posts.")
    }

    opusItems.push(...(response.data?.items ?? []))
    const nextOffset = response.data?.offset
    if (!response.data?.has_more || !nextOffset || nextOffset === offset) break
    offset = nextOffset
  }

  const author = opusItems.find(item => item.author?.name)?.author
  return {
    items: opusItems
      .map(upOpusItemToNewsItem)
      .filter((item): item is NewsItemInput => item !== null)
      .slice(0, UP_RESULT_LIMIT),
    metadata: {
      title: author?.name ? `${author.name}｜图文` : "UP 主图文",
      home: `https://space.bilibili.com/${normalizedMid}/upload/opus`,
    },
  }
}

async function fetchBilibiliUpAudio(
  { mid }: { mid: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const normalizedMid = normalizeBilibiliUpId(mid)
  const response = await context.fetch.get(UP_AUDIO_URL, {
    headers: { referer: `https://space.bilibili.com/${normalizedMid}/upload/audio` },
    searchParams: {
      pn: 1,
      ps: 42,
      order: 1,
      uid: normalizedMid,
    },
  }).json<BilibiliUpAudioResponse>()

  if (response.code !== 0) {
    throw new Error(response.message ?? response.msg ?? "Failed to load Bilibili UP audio.")
  }

  const audioItems = response.data?.data ?? []
  const authorName = audioItems.find(item => item.uname?.trim())?.uname?.trim()
  return {
    items: audioItems
      .map(upAudioItemToNewsItem)
      .filter((item): item is NewsItemInput => item !== null)
      .slice(0, UP_RESULT_LIMIT),
    metadata: {
      title: authorName ? `${authorName}｜音频` : "UP 主音频",
      home: `https://space.bilibili.com/${normalizedMid}/upload/audio`,
    },
  }
}

const upIdParam = {
  type: "text",
  title: "UP 主 ID",
  description: "UP 主空间地址中的数字 ID。",
  default: "2",
} as const

export const upSources = {
  "up-video": {
    metadata: {
      title: "UP 主视频｜最新发布",
      desc: "指定 UP 主的视频投稿",
    },
    params: {
      mid: upIdParam,
      order: {
        type: "select",
        title: "排序",
        values: [
          { label: "最新发布", value: "pubdate" },
          { label: "最多播放", value: "click" },
          { label: "最多收藏", value: "stow" },
        ],
        default: "pubdate",
      },
    },
    radar: [
      {
        id: "bilibili-up-video",
        match: {
          hosts: ["space.bilibili.com"],
          paths: {
            include: [
              {
                regex: "^https://space\\.bilibili\\.com/(?<mid>\\d+)/upload/video(?:[/?#]|$)",
              },
            ],
          },
        },
        patch: {
          params: {
            mid: "{{ scope.path.mid }}",
            order: () => {
              const page = globalThis as unknown as {
                document: {
                  querySelectorAll: (selector: string) => ArrayLike<{
                    classList: { contains: (className: string) => boolean }
                  }>
                }
              }
              const filters = Array.from(page.document.querySelectorAll(".radio-filter__item")).slice(0, 3)
              const activeIndex = filters.findIndex(filter => filter.classList.contains("radio-filter__item--active"))
              return (["pubdate", "click", "stow"] as const)[activeIndex] ?? "pubdate"
            },
          },
          metadata: {
            home: "https://space.bilibili.com/{{ scope.params.mid | url_path }}/upload/video",
          },
        },
        confidence: 1,
      },
    ],
    loader: {
      type: "custom",
      load: fetchBilibiliUpVideo,
    },
    capabilities: bilibiliApiCapabilities,
  },
  "up-opus": {
    metadata: {
      title: "UP 主图文",
      desc: "指定 UP 主发布的图文",
    },
    params: {
      mid: upIdParam,
    },
    radar: [
      {
        id: "bilibili-up-opus",
        match: {
          hosts: ["space.bilibili.com"],
          paths: {
            include: [
              {
                regex: "^https://space\\.bilibili\\.com/(?<mid>\\d+)/upload/opus(?:[/?#]|$)",
              },
            ],
          },
        },
        patch: {
          params: {
            mid: "{{ scope.path.mid }}",
          },
          metadata: {
            title: {
              select: ".nickname",
              template: "{{ scope.value }}｜图文",
            },
            home: "https://space.bilibili.com/{{ scope.params.mid | url_path }}/upload/opus",
          },
        },
        confidence: 1,
      },
    ],
    loader: {
      type: "custom",
      load: fetchBilibiliUpOpus,
    },
    capabilities: bilibiliApiCapabilities,
  },
  "up-audio": {
    metadata: {
      title: "UP 主音频",
      desc: "指定 UP 主发布的音频",
    },
    params: {
      mid: upIdParam,
    },
    radar: [
      {
        id: "bilibili-up-audio",
        match: {
          hosts: ["space.bilibili.com"],
          paths: {
            include: [
              {
                regex: "^https://space\\.bilibili\\.com/(?<mid>\\d+)/upload/audio(?:[/?#]|$)",
              },
            ],
          },
        },
        patch: {
          params: {
            mid: "{{ scope.path.mid }}",
          },
          metadata: {
            title: {
              select: ".nickname",
              template: "{{ scope.value }}｜音频",
            },
            home: "https://space.bilibili.com/{{ scope.params.mid | url_path }}/upload/audio",
          },
        },
        confidence: 1,
      },
    ],
    loader: {
      type: "custom",
      load: fetchBilibiliUpAudio,
    },
    capabilities: bilibiliApiCapabilities,
  },
} satisfies Record<string, ProviderSourceConfig>
