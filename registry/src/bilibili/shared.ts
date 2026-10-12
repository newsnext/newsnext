import { fieldTransforms } from "@newsnext/source-kit/core"

export const BILIBILI_WEB_LOCATION = "333.1365"

const BILIBILI_TIMEZONE = "Asia/Shanghai"
const BILIBILI_DYNAMIC_EPOCH_SECONDS = 1_498_838_400n

export const bilibiliApiCapabilities = {
  network: ["api.bilibili.com"],
} as const

export const bilibiliUserIdParam = {
  type: "text",
  title: "用户 ID",
  description: "用户空间地址中的数字 ID。",
  default: "282994",
  required: true,
  validate: { format: "digits" },
} as const

export function normalizeBilibiliUrl(url: string): string {
  if (url.startsWith("//")) return `https:${url}`
  return url.replace(/^http:/, "https:")
}

export function parseBilibiliTimestamp(value: number | string | undefined): number | undefined {
  const timestamp = fieldTransforms.seconds_to_ms(value)
  return timestamp !== undefined && timestamp > 0 ? timestamp : undefined
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
  const toTimestamp = (year: number) => fieldTransforms.date_to_ms(
    explicitYear ? displayDate : `${year}年${displayDate}`,
    { format: "yyyy年MM月dd日", timezone: BILIBILI_TIMEZONE },
  )
  let timestamp = toTimestamp(currentYear)
  if (timestamp === undefined) return undefined
  if (!explicitYear && timestamp > now) timestamp = toTimestamp(currentYear - 1)
  return timestamp
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
  const numericText = value?.trim().match(/^\d+(?:\.\d+)?\s*[KMBT千万亿]?/i)?.[0]
  const count = fieldTransforms.parse_compact_number(numericText)
  return count === undefined ? undefined : Math.round(count)
}

export function parseBilibiliNumericCount(value: number | string | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined
  return parseBilibiliCount(value)
}

export function compactBilibiliTitle(value: string | undefined): string | undefined {
  const text = fieldTransforms.normalize_whitespace(value)
  if (!text) return undefined
  return fieldTransforms.truncate(text, 80, "…")
}
