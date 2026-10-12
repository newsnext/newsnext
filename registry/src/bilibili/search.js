import { fieldTransforms } from "@newsnext/source-kit/core"
import { bilibiliApiCapabilities, normalizeBilibiliUrl, parseBilibiliNumericCount, parseBilibiliTimestamp } from "./shared.js"
import { getBilibiliWbiKeys, signBilibiliWbiParams } from "./wbi.js"

const BILIBILI_SEARCH_URL = "https://api.bilibili.com/x/web-interface/wbi/search/type"
const BILIBILI_SEARCH_TIMEZONE_OFFSET = "+08:00"
const BILIBILI_SEARCH_ORDER_LABELS = {
  click: "最多播放",
  dm: "最多弹幕",
  pubdate: "最新发布",
  stow: "最多收藏",
}
const BILIBILI_SEARCH_DATE_DAYS = {
  day: 1,
  halfyear: 180,
  week: 7,
}
function formatBilibiliSearchDate(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(timestamp)
}
function parseBilibiliSearchDate(value) {
  return Math.floor(Date.parse(`${value}T00:00:00${BILIBILI_SEARCH_TIMEZONE_OFFSET}`) / 1000)
}
export function getBilibiliSearchDateRange(date, startDate, endDate, now = Date.now()) {
  if (date === "all")
    return { begin: 0, end: 0 }
  if (date === "custom") {
    const begin = parseBilibiliSearchDate(startDate)
    const endStart = parseBilibiliSearchDate(endDate)
    return { begin, end: endStart + 86_399 }
  }
  const days = BILIBILI_SEARCH_DATE_DAYS[date]
  const today = formatBilibiliSearchDate(now)
  const todayStart = parseBilibiliSearchDate(today)
  return {
    begin: todayStart - (days - 1) * 86_400,
    end: todayStart + 86_399,
  }
}
function cleanBilibiliSearchText(value) {
  const text = fieldTransforms.strip_html(value).trim()
  return text || undefined
}
export function searchVideoItemToNewsItem(item) {
  const title = cleanBilibiliSearchText(item.title)
  const url = item.bvid
    ? `https://www.bilibili.com/video/${item.bvid}`
    : item.arcurl
      ? normalizeBilibiliUrl(item.arcurl)
      : undefined
  if (!title || !url)
    return null
  return {
    title,
    url,
    publishedAt: parseBilibiliTimestamp(item.pubdate),
    author: {
      name: item.author,
      home: item.mid ? `https://space.bilibili.com/${item.mid}` : undefined,
    },
    icon: {
      kind: "author",
      label: item.author,
      src: item.upic ? normalizeBilibiliUrl(item.upic) : undefined,
    },
    stats: {
      stars: parseBilibiliNumericCount(item.favorites),
      views: parseBilibiliNumericCount(item.play),
    },
    attributes: {
      danmaku: parseBilibiliNumericCount(item.danmaku),
    },
    content: {
      text: cleanBilibiliSearchText(item.description),
      pictures: item.pic ? normalizeBilibiliUrl(item.pic) : undefined,
    },
  }
}
async function fetchBilibiliSearch({ date, duration, endDate, keyword, order, startDate }, context) {
  const range = getBilibiliSearchDateRange(date, startDate, endDate)
  const { imgUrl, subUrl } = await getBilibiliWbiKeys(context)
  const searchParams = await signBilibiliWbiParams({
    duration: Number(duration),
    keyword,
    order,
    page: 1,
    page_size: 42,
    platform: "pc",
    pubtime_begin_s: range.begin,
    pubtime_end_s: range.end,
    search_type: "video",
    web_location: 1430654,
  }, imgUrl, subUrl)
  const response = await context.fetch.get(BILIBILI_SEARCH_URL, {
    headers: { referer: "https://search.bilibili.com/" },
    searchParams,
  }).json()
  if (response.code !== 0) {
    throw new Error(response.message ?? "Failed to search Bilibili videos.")
  }
  const homeParams = new URLSearchParams({
    keyword,
    order,
  })
  if (duration !== "0")
    homeParams.set("duration", duration)
  if (range.begin && range.end) {
    homeParams.set("pubtime_begin_s", String(range.begin))
    homeParams.set("pubtime_end_s", String(range.end))
  }
  return {
    items: (response.data?.result ?? [])
      .map(searchVideoItemToNewsItem)
      .filter(item => item !== null),
    metadata: {
      title: `${keyword} | ${BILIBILI_SEARCH_ORDER_LABELS[order]}`,
      home: `https://search.bilibili.com/video?${homeParams}`,
      type: order === "pubdate" ? undefined : "ranking",
    },
  }
}
export const searchSource = {
  version: 4,
  metadata: {
    title: "视频搜索",
    desc: "按关键词搜索哔哩哔哩视频",
  },
  params: {
    keyword: {
      type: "text",
      title: "关键词",
      default: "科技",
      required: true,
    },
    order: {
      type: "select",
      title: "排序",
      values: [
        { label: "最多播放", value: "click" },
        { label: "最新发布", value: "pubdate" },
        { label: "最多弹幕", value: "dm" },
        { label: "最多收藏", value: "stow" },
      ],
      default: "pubdate",
    },
    date: {
      type: "select",
      title: "日期",
      values: [
        { label: "全部日期", value: "all" },
        { label: "最近一天", value: "day" },
        { label: "最近一周", value: "week" },
        { label: "最近半年", value: "halfyear" },
        { label: "自定义日期", value: "custom" },
      ],
      default: "all",
    },
    startDate: {
      type: "text",
      title: "开始日期",
      description: "自定义日期使用 YYYY-MM-DD。",
      default: "",
      validate: { regex: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    endDate: {
      type: "text",
      title: "结束日期",
      description: "自定义日期使用 YYYY-MM-DD。",
      default: "",
      validate: { regex: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    duration: {
      type: "select",
      title: "时长",
      values: [
        { label: "全部时长", value: "0" },
        { label: "10 分钟以下", value: "1" },
        { label: "10–30 分钟", value: "2" },
        { label: "30–60 分钟", value: "3" },
        { label: "60 分钟以上", value: "4" },
      ],
      default: "0",
    },
  },
  radar: [
    {
      id: "bilibili-video-search",
      match: {
        hosts: ["search.bilibili.com"],
        paths: ["/video"],
        query: ["keyword"],
      },
      patch: {
        params: {
          keyword: "{{ scope.query.keyword }}",
          order: "{{ scope.query.order }}",
          date: { type: "date-range", start: "pubtime_begin_s", end: "pubtime_end_s", ranges: { 1: "day", 7: "week", 180: "halfyear" }, other: "custom" },
          startDate: { type: "query", key: "pubtime_begin_s", timestamp: { unit: "seconds", timezone: "Asia/Shanghai" } },
          endDate: { type: "query", key: "pubtime_end_s", timestamp: { unit: "seconds", timezone: "Asia/Shanghai" } },
          duration: "{{ scope.query.duration }}",
        },
      },
    },
  ],
  loader: {
    type: "custom",
    load: fetchBilibiliSearch,
  },
  capabilities: bilibiliApiCapabilities,
}
