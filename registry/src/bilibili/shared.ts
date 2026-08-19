import type { SourceLoaderContext } from "@newsnext/source-kit/types"
import { transformToUTC } from "@newsnext/date-parser"

export const BILIBILI_WEB_LOCATION = "333.1365"
export const BILIBILI_USER_ID_SECRET_KEY = "userId"

const BILIBILI_TIMEZONE = "Asia/Shanghai"
const BILIBILI_DYNAMIC_EPOCH_SECONDS = 1_498_838_400n

export const bilibiliIdentitySecret = {
  key: BILIBILI_USER_ID_SECRET_KEY,
  type: "cookie",
  origin: "https://www.bilibili.com",
  itemKey: "DedeUserID",
  cache: false,
  required: false,
} as const

export const bilibiliApiCapabilities = {
  network: ["api.bilibili.com"],
} as const

export const bilibiliAuthenticatedCapabilities = {
  ...bilibiliApiCapabilities,
  cookies: ["api.bilibili.com", "www.bilibili.com"],
} as const

export const bilibiliUserIdParam = {
  type: "text",
  title: "用户 ID",
  description: "用户空间地址中的数字 ID。",
  default: "282994",
  required: true,
  validate: { format: "digits" },
} as const

export function readBilibiliUserId(): string | undefined {
  const page = globalThis as unknown as { document: { cookie: string } }
  const cookie = page.document.cookie
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith("DedeUserID="))
  return cookie?.slice("DedeUserID=".length)
}

export function getBilibiliIdentity(context: SourceLoaderContext): string | undefined {
  const identity = context.secrets?.[BILIBILI_USER_ID_SECRET_KEY]?.trim()
  return identity && /^\d+$/.test(identity) ? identity : undefined
}

export function normalizeBilibiliUrl(url: string): string {
  if (url.startsWith("//")) return `https:${url}`
  return url.replace(/^http:/, "https:")
}

export function parseBilibiliTimestamp(value: number | string | undefined): number | undefined {
  const timestamp = typeof value === "string" ? Number(value) : value
  if (timestamp === undefined || !Number.isFinite(timestamp) || timestamp <= 0) return undefined
  return timestamp * 1000
}

export function parseBilibiliDisplayDate(value: string | undefined, now = Date.now()): number | undefined {
  const displayDate = value?.trim()
  const match = displayDate?.match(/^(?:(\d{4})年)?\d{1,2}月\d{1,2}日$/)
  if (!displayDate || !match) return undefined

  const explicitYear = match[1]
  const currentYear = Number(new Intl.DateTimeFormat("en", {
    timeZone: BILIBILI_TIMEZONE,
    year: "numeric",
  }).format(now))
  const toTimestamp = (year: number) => transformToUTC(
    explicitYear ? displayDate : `${year}年${displayDate}`,
    "yyyy年MM月dd日",
    BILIBILI_TIMEZONE,
  )
  let timestamp = toTimestamp(currentYear)
  if (!Number.isFinite(timestamp)) return undefined
  if (!explicitYear && timestamp > now) timestamp = toTimestamp(currentYear - 1)
  return Number.isFinite(timestamp) ? timestamp : undefined
}

export function parseBilibiliOpusTimestamp(id: string | undefined): number | undefined {
  if (!id || !/^\d+$/.test(id)) return undefined
  try {
    const timestamp = (BigInt(id) >> 32n) + BILIBILI_DYNAMIC_EPOCH_SECONDS
    const milliseconds = Number(timestamp) * 1000
    return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : undefined
  } catch {
    return undefined
  }
}

export function parseBilibiliCount(value: string | undefined): number | undefined {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)\s*([万亿])?/)
  if (!match) return undefined

  const count = Number(match[1])
  const multiplier = match[2] === "亿" ? 100_000_000 : match[2] === "万" ? 10_000 : 1
  return Number.isFinite(count) ? Math.round(count * multiplier) : undefined
}

export function parseBilibiliNumericCount(value: number | string | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined
  return parseBilibiliCount(value)
}

export function compactBilibiliTitle(value: string | undefined): string | undefined {
  const text = value?.trim().replace(/\s+/g, " ")
  if (!text) return undefined
  const characters = Array.from(text)
  return characters.length > 80 ? `${characters.slice(0, 80).join("")}…` : text
}
