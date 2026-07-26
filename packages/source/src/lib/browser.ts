import type { NewsItem } from "@newsnext/source/typings"
import type { ProviderConfig } from "@newsnext/source/utils/source"
import type { Browser } from "@wxt-dev/browser"
import { browser } from "@wxt-dev/browser"

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const BROWSER_PROVIDER_ICON = "https://www.google.com/chrome/static/images/favicons/favicon-96x96.png"

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "week" },
  { label: "Last 30 days", value: "month" },
  { label: "All history", value: "all" },
] as const

type DateRange = (typeof DATE_RANGE_OPTIONS)[number]["value"]

interface BrowserHistoryParams {
  query: string
  dateRange: DateRange
  maxResults: number
}

interface BrowserBookmarksParams {
  folder: string
  maxResults: number
}

function getStartTime(dateRange: DateRange, now = Date.now()): number | undefined {
  switch (dateRange) {
    case "today":
      return new Date(now).setHours(0, 0, 0, 0)
    case "week":
      return now - (7 * MILLISECONDS_PER_DAY)
    case "month":
      return now - (30 * MILLISECONDS_PER_DAY)
    case "all":
      return undefined
  }
}

function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

function getFaviconUrl(url: string): string | undefined {
  const faviconUrl = new URL(browser.runtime.getURL("/_favicon/"))
  faviconUrl.searchParams.set("pageUrl", url)
  faviconUrl.searchParams.set("size", "64")
  return faviconUrl.toString()
}

function formatVisitCount(count: number | undefined): string {
  const visits = count ?? 0
  return `${visits} ${visits === 1 ? "visit" : "visits"}`
}

function browserHistoryItemsToNewsItems(historyItems: Browser.history.HistoryItem[]): NewsItem[] {
  const seen = new Set<string>()
  const items: NewsItem[] = []

  for (const historyItem of historyItems) {
    const url = historyItem.url
    if (!url || seen.has(url)) {
      continue
    }

    seen.add(url)
    const hostname = getHostname(url)
    const favicon = getFaviconUrl(url)
    const title = historyItem.title?.trim() || hostname || url
    const item: NewsItem = {
      title,
      url,
      inline: {
        text: hostname
          ? `${hostname} · ${formatVisitCount(historyItem.visitCount)}`
          : formatVisitCount(historyItem.visitCount),
        ...(favicon ? { icon: { src: favicon, radius: 4 } } : {}),
      },
    }

    if (typeof historyItem.lastVisitTime === "number") {
      item.timestamp = historyItem.lastVisitTime
    }

    items.push(item)
  }

  return items.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
}

function flattenBookmarkNodes(nodes: Browser.bookmarks.BookmarkTreeNode[]): Browser.bookmarks.BookmarkTreeNode[] {
  return nodes.flatMap(node => [
    node,
    ...flattenBookmarkNodes(node.children ?? []),
  ])
}

function getBookmarkFolderPath(path: string[], node: Browser.bookmarks.BookmarkTreeNode): string[] {
  return node.title ? [...path, node.title] : path
}

function findBookmarkFolder(
  nodes: Browser.bookmarks.BookmarkTreeNode[],
  folder: string,
  path: string[] = [],
): Browser.bookmarks.BookmarkTreeNode | undefined {
  const normalizedFolder = folder.trim().toLowerCase()
  for (const node of nodes) {
    const currentPath = getBookmarkFolderPath(path, node)
    const normalizedPath = currentPath.join("/").toLowerCase()
    if (
      node.children
      && (
        node.id === folder
        || node.title?.trim().toLowerCase() === normalizedFolder
        || normalizedPath === normalizedFolder
      )
    ) {
      return node
    }

    const matchedChild = findBookmarkFolder(node.children ?? [], folder, currentPath)
    if (matchedChild) {
      return matchedChild
    }
  }

  return undefined
}

function browserBookmarkNodesToNewsItems(bookmarkNodes: Browser.bookmarks.BookmarkTreeNode[]): NewsItem[] {
  return flattenBookmarkNodes(bookmarkNodes)
    .filter((node): node is Browser.bookmarks.BookmarkTreeNode & { url: string } => Boolean(node.url))
    .sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0))
    .map((node) => {
      const hostname = getHostname(node.url)
      const favicon = getFaviconUrl(node.url)
      const item: NewsItem = {
        title: node.title?.trim() || hostname || node.url,
        url: node.url,
        inline: {
          text: hostname ?? "Bookmark",
          ...(favicon ? { icon: { src: favicon, radius: 4 } } : {}),
        },
      }

      if (typeof node.dateAdded === "number") {
        item.timestamp = node.dateAdded
      }

      return item
    })
}

async function fetchBrowserHistory({
  query,
  dateRange,
  maxResults,
}: BrowserHistoryParams): Promise<NewsItem[]> {
  const searchQuery: Browser.history.HistoryQuery = {
    text: query.trim(),
    maxResults,
  }
  const startTime = getStartTime(dateRange)
  if (startTime !== undefined) {
    searchQuery.startTime = startTime
  }

  const historyItems = await browser.history.search(searchQuery)
  return browserHistoryItemsToNewsItems(historyItems)
}

async function readBookmarks(folder: string): Promise<Browser.bookmarks.BookmarkTreeNode[]> {
  const normalizedFolder = folder.trim()
  if (!normalizedFolder) {
    return browser.bookmarks.getTree()
  }

  try {
    return await browser.bookmarks.getSubTree(normalizedFolder)
  } catch {
    const tree = await browser.bookmarks.getTree()
    const matchedFolder = findBookmarkFolder(tree, normalizedFolder)
    if (!matchedFolder) {
      throw new Error(`Browser bookmarks folder not found: ${normalizedFolder}`)
    }

    return [matchedFolder]
  }
}

async function fetchBrowserBookmarks({
  folder,
  maxResults,
}: BrowserBookmarksParams): Promise<NewsItem[]> {
  const results = await readBookmarks(folder)
  return browserBookmarkNodesToNewsItems(results).slice(0, maxResults)
}

export default {
  title: "Browser",
  icon: BROWSER_PROVIDER_ICON,
  color: "blue",
  category: "others",
  sources: {
    history: {
      title: "History",
      type: "timeline",
      params: {
        query: {
          type: "text",
          title: "Search",
          default: "",
        },
        dateRange: {
          type: "select",
          title: "Date range",
          values: DATE_RANGE_OPTIONS,
          default: "week",
        },
        maxResults: {
          type: "number",
          title: "Limit",
          default: 50,
          min: 1,
          max: 100,
        },
      },
      loader: {
        type: "custom",
        load: fetchBrowserHistory,
      },
      capabilities: { browser: ["history"] },
      cache: "1m",
    },
    bookmarks: {
      title: "Bookmarks",
      type: "timeline",
      params: {
        folder: {
          type: "text",
          title: "Folder",
          description: "Leave empty to include every bookmark. Use a folder ID, title, or path.",
          default: "",
        },
        maxResults: {
          type: "number",
          title: "Limit",
          default: 50,
          min: 1,
          max: 200,
        },
      },
      loader: {
        type: "custom",
        load: fetchBrowserBookmarks,
      },
      capabilities: { browser: ["bookmarks", "favicon"] },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
