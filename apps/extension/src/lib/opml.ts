import { XMLParser, XMLValidator } from "fast-xml-parser"

export interface OpmlFeed {
  title?: string
  url: string
}

export interface OpmlImport {
  feeds: OpmlFeed[]
  title: string
}

export class OpmlImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OpmlImportError"
  }
}

export function parseOpml(source: string): OpmlImport {
  if (XMLValidator.validate(source) !== true) {
    throw new OpmlImportError("The selected file is not valid XML.")
  }

  const parsed: unknown = new XMLParser({
    attributeNamePrefix: "",
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  }).parse(source)
  const opml = readRecord(readRecord(parsed)?.opml)
  if (!opml) {
    throw new OpmlImportError("The selected file is not an OPML document.")
  }

  const head = readRecord(opml.head)
  const title = readText(head?.title)
  if (!title) {
    throw new OpmlImportError("The OPML document does not have a title.")
  }

  const body = readRecord(opml.body)
  const feeds = collectFeeds(body?.outline)
  if (feeds.length === 0) {
    throw new OpmlImportError("The OPML document does not contain any RSS feeds.")
  }

  return { feeds, title }
}

function collectFeeds(value: unknown): OpmlFeed[] {
  const feeds: OpmlFeed[] = []
  const seenUrls = new Set<string>()

  function visit(outlineValue: unknown): void {
    for (const item of Array.isArray(outlineValue) ? outlineValue : [outlineValue]) {
      const outline = readRecord(item)
      if (!outline) continue

      const rawUrl = readText(outline.xmlUrl)
      if (rawUrl) {
        const url = normalizeFeedUrl(rawUrl)
        if (!url) {
          throw new OpmlImportError(`The OPML document contains an invalid feed URL: ${rawUrl}`)
        }
        if (!seenUrls.has(url)) {
          const title = readOutlineTitle(outline)
          seenUrls.add(url)
          feeds.push({
            url,
            ...(title ? { title } : {}),
          })
        }
      }

      if (outline.outline !== undefined) {
        visit(outline.outline)
      }
    }
  }

  visit(value)
  return feeds
}

function normalizeFeedUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined
  } catch {
    return undefined
  }
}

function readOutlineTitle(outline: Record<string, unknown>): string | undefined {
  return readText(outline.title) ?? readText(outline.text)
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function readText(value: unknown): string | undefined {
  if (typeof value !== "string") return
  const normalized = value.trim()
  return normalized || undefined
}
