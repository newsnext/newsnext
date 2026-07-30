import type { ProviderConfig } from "@newsnext/source/registry"
import type { NewsItem } from "@newsnext/source/types"
import type { Browser } from "@wxt-dev/browser"
import { browser } from "@wxt-dev/browser"

const CHROME_ICON_SVG = `<svg fill="none" viewBox="0 0 63 63" xmlns="http://www.w3.org/2000/svg">
  <linearGradient id="a" gradientUnits="userSpaceOnUse" x1="34.9087" x2="7.63224" y1="61.029" y2="13.7847">
    <stop offset="0" stop-color="#1e8e3e"/>
    <stop offset="1" stop-color="#34a853"/>
  </linearGradient>
  <linearGradient id="b" gradientUnits="userSpaceOnUse" x1="26.9043" x2="54.1808" y1="63.0788" y2="15.8345">
    <stop offset="0" stop-color="#fcc934"/>
    <stop offset="1" stop-color="#fbbc04"/>
  </linearGradient>
  <linearGradient id="c" gradientUnits="userSpaceOnUse" x1="4.22145" x2="58.7745" y1="19.6884" y2="19.6884">
    <stop offset="0" stop-color="#d93025"/>
    <stop offset="1" stop-color="#ea4335"/>
  </linearGradient>
  <path d="m31.499 47.2466c8.6985 0 15.75-7.0515 15.75-15.75s-7.0515-15.75-15.75-15.75-15.75 7.0515-15.75 15.75 7.0515 15.75 15.75 15.75z" fill="#fff"/>
  <path d="m17.8591 39.3751-13.63772-23.6212c-2.76527 4.788-4.22118922 10.2197-4.22137998 15.7489s1.45535998 10.961 4.22028998 15.7492c2.76494 4.7882 6.74181 8.7641 11.53071 11.5279 4.7889 2.7637 10.221 4.2179 15.7502 4.2164l13.6377-23.6212v-.0041c-1.3813 2.3954-3.369 4.3848-5.7632 5.7681s-5.1104 2.1118-7.8755 2.1122-5.4816-.7272-7.8762-2.1099c-2.3945-1.3826-4.3829-3.3714-5.7649-5.7663z" fill="url(#a)"/>
  <path d="m45.1379 39.3741-13.6376 23.6212c5.5292.0008 10.9611-1.4542 15.7496-4.2187 4.7885-2.7644 8.7648-6.7408 11.5291-11.5294 2.7642-4.7887 4.219-10.2207 4.2181-15.7499-.001-5.5292-1.4577-10.9606-4.2237-15.7483h-27.2754l-.0034.0021c2.7651-.0014 5.4818.7254 7.8769 2.1071 2.3951 1.3818 4.3841 3.3698 5.767 5.7643 1.3829 2.3944 2.1109 5.1108 2.1109 7.8758-.0001 2.7651-.7283 5.4814-2.1113 7.8758z" fill="url(#b)"/>
  <path d="m31.499 43.9688c6.8863 0 12.4688-5.5825 12.4688-12.4688s-5.5825-12.4688-12.4688-12.4688-12.4687 5.5825-12.4687 12.4688 5.5824 12.4688 12.4687 12.4688z" fill="#1a73e8"/>
  <path d="m31.4991 15.75h27.2754c-2.764-4.7888-6.74-8.76553-11.5283-11.53029-4.7883-2.76475-10.2202-4.22010235-15.7494-4.21970992s-10.9608 1.45650992-15.7487 4.22194992c-4.788 2.76543-8.76341 6.74275-11.52666 11.53185l13.63766 23.6212.0035.0019c-1.3837-2.394-2.1127-5.11-2.1136-7.8751s.7264-5.4817 2.1086-7.8765c1.3821-2.3948 3.3706-4.3835 5.7652-5.7659 2.3947-1.3825 5.1112-2.11 7.8763-2.1094z" fill="url(#c)"/>
</svg>`
const CHROME_ICON = `data:image/svg+xml,${encodeURIComponent(CHROME_ICON_SVG)}`
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
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
  const normalizedFolder = folder.toLowerCase()
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
    text: query,
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
  const normalizedFolder = folder
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
  icon: CHROME_ICON,
  color: "blue",
  defaults: {
    cache: "5m",
    loader: {
      type: "custom",
    },
    metadata: {
      type: "timeline",
    },
  },
  sources: {
    history: {
      metadata: {
        title: "History",
      },
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
        load: fetchBrowserHistory,
      },
      capabilities: { browser: ["history"] },
      cache: "1m",
    },
    bookmarks: {
      metadata: {
        title: "Bookmarks",
      },
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
        load: fetchBrowserBookmarks,
      },
      capabilities: { browser: ["bookmarks", "favicon"] },
    },
  },
} satisfies ProviderConfig
