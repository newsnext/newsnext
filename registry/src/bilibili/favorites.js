import { fieldTransforms } from "@newsnext/sdk/source"
import { BILIBILI_WEB_LOCATION, bilibiliApiCapabilities, normalizeBilibiliUrl } from "./shared.js"

const FAVORITE_FOLDERS_URL = "https://api.bilibili.com/x/v3/fav/folder/created/list-all"
const FAVORITE_RESOURCES_URL = "https://api.bilibili.com/x/v3/fav/resource/list"
const SERIES_RESOURCES_URL = "https://api.bilibili.com/x/space/fav/season/list"
const FAVORITE_MAX_PAGES = 3
const FAVORITE_RESULT_LIMIT = 30
const BILIBILI_USER_ID_SECRET = {
  key: "userId",
  type: "cookie",
  origin: "https://www.bilibili.com",
  itemKey: "DedeUserID",
  cache: false,
  required: false,
}
const BILIBILI_FAVORITE_ORDER_LABELS = {
  mtime: "最近收藏",
  pubtime: "最近投稿",
  view: "最多播放",
}
export function favoriteMediaToNewsItem(media) {
  const bvid = media.bvid ?? media.bv_id
  if (!media.title || !bvid)
    return null
  return {
    title: media.title,
    url: `https://www.bilibili.com/video/${bvid}`,
    publishedAt: fieldTransforms.seconds_to_ms(media.pubtime || undefined),
    author: {
      name: media.upper?.name,
      home: media.upper?.mid ? `https://space.bilibili.com/${media.upper.mid}` : undefined,
    },
    icon: {
      kind: "author",
      label: media.upper?.name,
      src: media.upper?.face ? normalizeBilibiliUrl(media.upper.face) : undefined,
    },
    stats: {
      stars: media.cnt_info?.collect,
      views: media.cnt_info?.play,
    },
    content: {
      text: media.intro,
      pictures: media.cover ? normalizeBilibiliUrl(media.cover) : undefined,
    },
  }
}
async function fetchBilibiliFavorites({ folder, mid, order }, context) {
  let mediaId = folder
  const signedInUserId = context.secrets?.[BILIBILI_USER_ID_SECRET.key]?.trim()
  const targetMid = mid || (signedInUserId && /^\d+$/.test(signedInUserId) ? signedInUserId : undefined)
  if (!mediaId) {
    if (!targetMid)
      throw new Error("Provide a Bilibili user ID or sign in to load a default favorite folder.")
    const response = await context.fetch.get(FAVORITE_FOLDERS_URL, {
      headers: { referer: `https://space.bilibili.com/${targetMid}/favlist` },
      searchParams: { up_mid: targetMid },
    }).json()
    if (response.code !== 0) {
      throw new Error(response.message ?? "Failed to load Bilibili favorite folders.")
    }
    const defaultFolder = response.data?.list?.[0]
    if (!defaultFolder?.id)
      throw new Error("The Bilibili account has no favorite folders.")
    mediaId = String(defaultFolder.id)
  }
  const medias = []
  let folderInfo
  for (let page = 1; page <= FAVORITE_MAX_PAGES && medias.length < FAVORITE_RESULT_LIMIT; page += 1) {
    const response = await context.fetch.get(FAVORITE_RESOURCES_URL, {
      headers: { referer: "https://www.bilibili.com/" },
      searchParams: {
        media_id: mediaId,
        pn: page,
        ps: 20,
        keyword: "",
        order,
        type: 0,
        tid: 0,
        platform: "web",
      },
    }).json()
    if (response.code !== 0) {
      throw new Error(response.message ?? "Failed to load Bilibili favorites.")
    }
    folderInfo ??= response.data?.info
    medias.push(...(response.data?.medias ?? []))
    if (!response.data?.has_more)
      break
  }
  const ownerId = folderInfo?.mid ?? (targetMid ? Number(targetMid) : undefined)
  return {
    items: medias
      .map(favoriteMediaToNewsItem)
      .filter(item => item !== null)
      .slice(0, FAVORITE_RESULT_LIMIT),
    metadata: {
      title: `${folderInfo?.title ?? "收藏夹"} | ${BILIBILI_FAVORITE_ORDER_LABELS[order]}`,
      badge: folderInfo?.cover ? normalizeBilibiliUrl(folderInfo.cover) : undefined,
      type: order === "view" ? "ranking" : undefined,
      home: ownerId
        ? `https://space.bilibili.com/${ownerId}/favlist?fid=${mediaId}&ftype=create`
        : undefined,
    },
  }
}
async function fetchBilibiliSeries({ seasonId }, context) {
  const response = await context.fetch.get(SERIES_RESOURCES_URL, {
    headers: { referer: "https://www.bilibili.com/" },
    searchParams: {
      season_id: seasonId,
      pn: 1,
      ps: 30,
      web_location: BILIBILI_WEB_LOCATION,
    },
  }).json()
  if (response.code !== 0) {
    throw new Error(response.message ?? "Failed to load Bilibili series.")
  }
  const info = response.data?.info
  const title = info?.title?.trim()
  const desc = info?.intro?.trim()
  const badge = info?.cover ? normalizeBilibiliUrl(info.cover) : undefined
  return {
    items: (response.data?.medias ?? [])
      .map(favoriteMediaToNewsItem)
      .filter(item => item !== null)
      .sort((left, right) => (right.publishedAt ?? 0) - (left.publishedAt ?? 0)),
    metadata: {
      title,
      badge,
      desc,
    },
  }
}
export const favoriteSources = {
  favorites: {
    version: 3,
    metadata: {
      title: "收藏夹视频",
      desc: "收藏夹中的视频",
    },
    params: {
      mid: {
        type: "text",
        title: "用户 ID",
        description: "收藏夹所属账号的空间 ID；留空时使用当前登录账号。",
        default: "",
        validate: { format: "digits" },
      },
      folder: {
        type: "text",
        title: "收藏夹 ID",
        description: "留空时使用当前账号的默认收藏夹。",
        default: "",
        validate: { format: "digits" },
      },
      order: {
        type: "select",
        title: "排序",
        values: [
          { label: "最近收藏", value: "mtime" },
          { label: "最多播放", value: "view" },
          { label: "最近投稿", value: "pubtime" },
        ],
        default: "mtime",
      },
    },
    radar: [
      {
        id: "bilibili-favorites",
        match: {
          hosts: ["space.bilibili.com"],
          paths: ["/:mid/favlist"],
        },
        patch: {
          params: {
            folder: "{{ scope.query.fid }}",
            mid: "{{ scope.path.mid }}",
            order: { type: "selected", select: ".radio-filter__item", active: ".radio-filter__item--active", values: ["mtime", "view", "pubtime"] },
          },
        },
      },
    ],
    loader: {
      type: "custom",
      load: fetchBilibiliFavorites,
    },
    secrets: [BILIBILI_USER_ID_SECRET],
    capabilities: {
      ...bilibiliApiCapabilities,
      cookies: ["www.bilibili.com"],
    },
  },
  series: {
    metadata: {
      title: "合集",
      desc: "合集中的视频",
    },
    params: {
      seasonId: {
        type: "text",
        title: "合集 ID",
        description: "合集页面地址中的数字 ID。",
        default: "7701562",
        required: true,
        validate: { format: "digits" },
      },
    },
    radar: [
      {
        id: "bilibili-followed-series",
        match: {
          hosts: ["space.bilibili.com"],
          paths: ["/:mid/favlist"],
          query: ["ctype", "fid", "ftype"],
        },
        patch: {
          params: {
            seasonId: "{{ scope.query.fid }}",
          },
          metadata: {
            home: "https://space.bilibili.com/{{ scope.path.mid }}/favlist?fid={{ scope.params.seasonId }}&ftype=collect&ctype=21",
          },
        },
      },
      {
        id: "bilibili-series",
        match: {
          hosts: ["space.bilibili.com"],
          paths: ["/:mid/lists/:seasonId"],
        },
        patch: {
          params: {
            seasonId: "{{ scope.path.seasonId }}",
          },
          metadata: {
            home: "https://space.bilibili.com/{{ scope.path.mid }}/lists/{{ scope.params.seasonId }}?type=season",
          },
        },
      },
    ],
    loader: {
      type: "custom",
      load: fetchBilibiliSeries,
    },
    capabilities: bilibiliApiCapabilities,
  },
}
