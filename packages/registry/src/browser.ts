import type { ProviderConfig } from "@newsnext/source/registry"
import type { NewsItemInput, SourceLoaderOutput } from "@newsnext/source/types"
import type { Browser } from "@wxt-dev/browser"
import { browser } from "@wxt-dev/browser"

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

function browserHistoryItemsToNewsItems(historyItems: Browser.history.HistoryItem[]): NewsItemInput[] {
  const seen = new Set<string>()
  const items: NewsItemInput[] = []

  for (const historyItem of historyItems) {
    const url = historyItem.url
    if (!url || seen.has(url)) {
      continue
    }

    seen.add(url)
    const hostname = getHostname(url)
    const favicon = getFaviconUrl(url)
    const title = historyItem.title?.trim() || hostname || url
    const item: NewsItemInput = {
      title,
      url,
      updatedAt: historyItem.lastVisitTime,
      attributes: { site: hostname },
      stats: { views: historyItem.visitCount ?? 0 },
      icon: {
        kind: "site",
        label: hostname,
        src: favicon,
      },
    }

    items.push(item)
  }

  return items.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
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

function browserBookmarkNodesToNewsItems(bookmarkNodes: Browser.bookmarks.BookmarkTreeNode[]): NewsItemInput[] {
  return flattenBookmarkNodes(bookmarkNodes)
    .filter((node): node is Browser.bookmarks.BookmarkTreeNode & { url: string } => Boolean(node.url))
    .sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0))
    .map((node) => {
      const hostname = getHostname(node.url)
      const favicon = getFaviconUrl(node.url)
      return {
        title: node.title?.trim() || hostname || node.url,
        url: node.url,
        publishedAt: node.dateAdded,
        attributes: { site: hostname ?? "Bookmark" },
        icon: {
          kind: "site",
          label: hostname,
          src: favicon,
        },
      }
    })
}

async function fetchBrowserHistory({
  query,
  dateRange,
  maxResults,
}: BrowserHistoryParams): Promise<SourceLoaderOutput> {
  const searchQuery: Browser.history.HistoryQuery = {
    text: query,
    maxResults,
  }
  const startTime = getStartTime(dateRange)
  if (startTime !== undefined) {
    searchQuery.startTime = startTime
  }

  const historyItems = await browser.history.search(searchQuery)
  return {
    items: browserHistoryItemsToNewsItems(historyItems),
    itemTemplate: { inline: "{{ scope.item.attributes.site }}" },
  }
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
}: BrowserBookmarksParams): Promise<SourceLoaderOutput> {
  const results = await readBookmarks(folder)
  return {
    items: browserBookmarkNodesToNewsItems(results).slice(0, maxResults),
    itemTemplate: { inline: "{{ scope.item.attributes.site }}" },
  }
}

export default {
  title: "Browser",
  icon: "https://s3.newsnext.app/icons/chrome.png",
  color: "blue",
  defaults: {
    cache: "5m",
    loader: {
      type: "custom",
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
    },
  },
} satisfies ProviderConfig
