import type { NewsItem } from "@newsnext/source-shared/typings"
import { $numberParam, $selectParam, $textParam } from "@newsnext/source-shared/utils/params"
import { $provider, $source } from "@newsnext/source-shared/utils/source"

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

interface BrowserHistoryItem {
  id?: string
  url?: string
  title?: string
  lastVisitTime?: number
  visitCount?: number
  typedCount?: number
}

interface BrowserHistorySearchQuery {
  text: string
  startTime?: number
  maxResults: number
}

interface BrowserHistoryApi {
  search: (
    query: BrowserHistorySearchQuery,
    callback?: (results: BrowserHistoryItem[]) => void,
  ) => Promise<BrowserHistoryItem[]> | void
}

interface BrowserBookmarkNode {
  id: string
  parentId?: string
  index?: number
  url?: string
  title?: string
  dateAdded?: number
  children?: BrowserBookmarkNode[]
}

interface BrowserBookmarksApi {
  getTree: (
    callback?: (results: BrowserBookmarkNode[]) => void,
  ) => Promise<BrowserBookmarkNode[]> | void
  getSubTree: (
    id: string,
    callback?: (results: BrowserBookmarkNode[]) => void,
  ) => Promise<BrowserBookmarkNode[]> | void
}

interface BrowserExtensionGlobal {
  chrome?: {
    bookmarks?: BrowserBookmarksApi
    history?: BrowserHistoryApi
    runtime?: {
      lastError?: { message?: string }
      getURL?: (path: string) => string
    }
  }
  browser?: {
    bookmarks?: BrowserBookmarksApi
    history?: BrowserHistoryApi
    runtime?: {
      getURL?: (path: string) => string
    }
  }
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return typeof value === "object"
    && value !== null
    && "then" in value
    && typeof value.then === "function"
}

function getBrowserHistoryApi(): BrowserHistoryApi | undefined {
  return (globalThis as BrowserExtensionGlobal).browser?.history
}

function getChromeHistoryApi(): BrowserHistoryApi | undefined {
  return (globalThis as BrowserExtensionGlobal).chrome?.history
}

function getBrowserBookmarksApi(): BrowserBookmarksApi | undefined {
  return (globalThis as BrowserExtensionGlobal).browser?.bookmarks
}

function getChromeBookmarksApi(): BrowserBookmarksApi | undefined {
  return (globalThis as BrowserExtensionGlobal).chrome?.bookmarks
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
  const extensionGlobal = globalThis as BrowserExtensionGlobal
  const getRuntimeUrl = extensionGlobal.browser?.runtime?.getURL ?? extensionGlobal.chrome?.runtime?.getURL
  if (!getRuntimeUrl) {
    return undefined
  }

  const faviconUrl = new URL(getRuntimeUrl("/_favicon/"))
  faviconUrl.searchParams.set("pageUrl", url)
  faviconUrl.searchParams.set("size", "64")
  return faviconUrl.toString()
}

function formatVisitCount(count: number | undefined): string {
  const visits = count ?? 0
  return `${visits} ${visits === 1 ? "visit" : "visits"}`
}

export function browserHistoryItemsToNewsItems(historyItems: BrowserHistoryItem[]): NewsItem[] {
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

function flattenBookmarkNodes(nodes: BrowserBookmarkNode[]): BrowserBookmarkNode[] {
  return nodes.flatMap(node => [
    node,
    ...flattenBookmarkNodes(node.children ?? []),
  ])
}

function getBookmarkFolderPath(path: string[], node: BrowserBookmarkNode): string[] {
  return node.title ? [...path, node.title] : path
}

function findBookmarkFolder(
  nodes: BrowserBookmarkNode[],
  folder: string,
  path: string[] = [],
): BrowserBookmarkNode | undefined {
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

export function browserBookmarkNodesToNewsItems(bookmarkNodes: BrowserBookmarkNode[]): NewsItem[] {
  return flattenBookmarkNodes(bookmarkNodes)
    .filter((node): node is BrowserBookmarkNode & { url: string } => Boolean(node.url))
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

export async function fetchBrowserHistory({
  query,
  dateRange,
  maxResults,
}: BrowserHistoryParams): Promise<NewsItem[]> {
  const searchQuery: BrowserHistorySearchQuery = {
    text: query.trim(),
    maxResults,
  }
  const startTime = getStartTime(dateRange)
  if (startTime !== undefined) {
    searchQuery.startTime = startTime
  }

  const browserHistory = getBrowserHistoryApi()
  if (browserHistory) {
    const maybeResults = browserHistory.search(searchQuery)
    if (isPromiseLike<BrowserHistoryItem[]>(maybeResults)) {
      return browserHistoryItemsToNewsItems(await maybeResults)
    }
  }

  const chromeHistory = getChromeHistoryApi()
  if (!chromeHistory) {
    throw new Error("Browser history API is not available.")
  }

  return await new Promise((resolve, reject) => {
    chromeHistory.search(searchQuery, (results) => {
      const extensionGlobal = globalThis as BrowserExtensionGlobal
      const lastError = extensionGlobal.chrome?.runtime?.lastError
      if (lastError) {
        reject(new Error(lastError.message ?? "Failed to search browser history."))
        return
      }

      resolve(browserHistoryItemsToNewsItems(results))
    })
  })
}

function readBrowserBookmarks(
  bookmarks: BrowserBookmarksApi,
  folder: string,
): Promise<BrowserBookmarkNode[]> | undefined {
  const normalizedFolder = folder.trim()
  const maybeResults = normalizedFolder
    ? bookmarks.getSubTree(normalizedFolder)
    : bookmarks.getTree()

  return isPromiseLike<BrowserBookmarkNode[]>(maybeResults)
    ? maybeResults
    : undefined
}

function readChromeBookmarks(
  bookmarks: BrowserBookmarksApi,
  folder: string,
): Promise<BrowserBookmarkNode[]> {
  const normalizedFolder = folder.trim()

  return new Promise((resolve, reject) => {
    const callback = (results: BrowserBookmarkNode[]) => {
      const extensionGlobal = globalThis as BrowserExtensionGlobal
      const lastError = extensionGlobal.chrome?.runtime?.lastError
      if (lastError) {
        reject(new Error(lastError.message ?? "Failed to read browser bookmarks."))
        return
      }

      resolve(results)
    }

    if (normalizedFolder) {
      bookmarks.getSubTree(normalizedFolder, callback)
    } else {
      bookmarks.getTree(callback)
    }
  })
}

async function readBookmarksFromFolder(
  readBookmarks: (folder: string) => Promise<BrowserBookmarkNode[]>,
  folder: string,
): Promise<BrowserBookmarkNode[]> {
  const normalizedFolder = folder.trim()
  if (!normalizedFolder) {
    return await readBookmarks("")
  }

  try {
    return await readBookmarks(normalizedFolder)
  } catch {
    const tree = await readBookmarks("")
    const matchedFolder = findBookmarkFolder(tree, normalizedFolder)
    if (!matchedFolder) {
      throw new Error(`Browser bookmarks folder not found: ${normalizedFolder}`)
    }

    return [matchedFolder]
  }
}

export async function fetchBrowserBookmarks({
  folder,
  maxResults,
}: BrowserBookmarksParams): Promise<NewsItem[]> {
  const browserBookmarks = getBrowserBookmarksApi()
  if (browserBookmarks) {
    const results = await readBookmarksFromFolder(async (targetFolder) => {
      const maybeResults = readBrowserBookmarks(browserBookmarks, targetFolder)
      if (!maybeResults) {
        throw new Error("Browser bookmarks API did not return a promise.")
      }

      return await maybeResults
    }, folder)

    if (results) {
      return browserBookmarkNodesToNewsItems(results).slice(0, maxResults)
    }
  }

  const chromeBookmarks = getChromeBookmarksApi()
  if (!chromeBookmarks) {
    throw new Error("Browser bookmarks API is not available.")
  }

  const results = await readBookmarksFromFolder(
    targetFolder => readChromeBookmarks(chromeBookmarks, targetFolder),
    folder,
  )
  return browserBookmarkNodesToNewsItems(results).slice(0, maxResults)
}

export default $provider({
  title: "Browser",
  icon: BROWSER_PROVIDER_ICON,
  color: "sky",
  category: "others",
  sources: [
    $source(
      {
        key: "history",
        title: "History",
        type: "timeline",
        params: {
          query: $textParam({
            title: "Search",
            default: "",
          }),
          dateRange: $selectParam<DateRange>({
            title: "Date range",
            options: [...DATE_RANGE_OPTIONS],
            default: "week",
          }),
          maxResults: $numberParam({
            title: "Limit",
            default: 50,
            min: 1,
            max: 100,
          }),
        },
      },
      fetchBrowserHistory,
    ),
    $source(
      {
        key: "bookmarks",
        title: "Bookmarks",
        type: "timeline",
        params: {
          folder: $textParam({
            title: "Folder",
            description: "Leave empty to include every bookmark. Use a folder ID, title, or path.",
            default: "",
          }),
          maxResults: $numberParam({
            title: "Limit",
            default: 50,
            min: 1,
            max: 200,
          }),
        },
      },
      fetchBrowserBookmarks,
    ),
  ],
})
