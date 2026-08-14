import type { NewsItem } from "@/typings/source"

export type BoardFilterMode = "include" | "exclude"

export interface BoardFilter {
  keywords: string[]
  mode: BoardFilterMode
}

const MAX_KEYWORDS = 20
const MAX_KEYWORD_LENGTH = 80

export function parseBoardFilterKeywords(value: string): string[] {
  const seen = new Set<string>()
  const keywords: string[] = []

  for (const candidate of value.split(/[,\n]/)) {
    const keyword = candidate.trim().slice(0, MAX_KEYWORD_LENGTH)
    const normalizedKeyword = keyword.toLowerCase()
    if (!keyword || seen.has(normalizedKeyword)) continue

    seen.add(normalizedKeyword)
    keywords.push(keyword)
    if (keywords.length === MAX_KEYWORDS) break
  }

  return keywords
}

export function createBoardFilter(
  mode: BoardFilterMode,
  keywordsValue: string,
): BoardFilter | undefined {
  const keywords = parseBoardFilterKeywords(keywordsValue)
  return keywords.length > 0 ? { keywords, mode } : undefined
}

export function normalizeBoardFilter(value: unknown): BoardFilter | undefined {
  if (!isRecord(value)
    || !isBoardFilterMode(value.mode)
    || !Array.isArray(value.keywords)
    || !value.keywords.every(keyword => typeof keyword === "string")) {
    return undefined
  }

  return createBoardFilter(value.mode, value.keywords.join(","))
}

export function filterBoardItems(
  items: NewsItem[],
  filter: BoardFilter | undefined,
): NewsItem[] {
  if (items.length === 0 || !filter || filter.keywords.length === 0) {
    return items
  }

  const keywords = filter.keywords.map(keyword => keyword.toLowerCase())
  return items.filter((item) => {
    const searchableText = [
      item.title,
      item.author?.name,
      item.content?.text,
      item.content?.html?.replace(/<[^>]*>/g, " "),
      ...Object.values(item.attributes ?? {}).map(String),
    ].filter(value => value !== undefined).join(" ").toLowerCase()
    const matches = keywords.some(keyword => searchableText.includes(keyword))
    return filter.mode === "include" ? matches : !matches
  })
}

function isBoardFilterMode(value: unknown): value is BoardFilterMode {
  return value === "include" || value === "exclude"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
