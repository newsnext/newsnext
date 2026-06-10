import type { SourceResponse } from "@newsnext/shared/types"
import { createProxyService, registerService } from "@webext-core/proxy-service"
import { browser } from "wxt/browser"
import { myFetch } from "@/lib/utils"

const COMMAND_BAR_SERVICE_KEY = "CommandBarService"
const GOOGLE_SUGGEST_CALLBACK = "window.google.ac.h"

type BookmarkTreeNode = Awaited<ReturnType<typeof browser.bookmarks.getTree>>[number]
type HistoryItem = Awaited<ReturnType<typeof browser.history.search>>[number]

interface GoogleSuggestResponse {
  1: Array<[string]>
}

function parseGoogleSuggestions(payload: string): string[] {
  const json = payload.replace(GOOGLE_SUGGEST_CALLBACK, "").slice(1, -1)
  const parsed = JSON.parse(json) as Partial<GoogleSuggestResponse>

  return Array.isArray(parsed[1])
    ? parsed[1].map(([label]) => label).filter(Boolean)
    : []
}

function getFaviconURL(rawURL: string | undefined): string | undefined {
  if (!rawURL) {
    return undefined
  }

  try {
    return `https://icons.duckduckgo.com/ip3/${new URL(rawURL).hostname}.ico`
  } catch {
    return undefined
  }
}

function flattenBookmarks(tree: BookmarkTreeNode[]): BookmarkTreeNode[] {
  return tree.flatMap((item) => {
    if (item.children) {
      return flattenBookmarks(item.children)
    }

    return item.url ? [item] : []
  })
}

function toSourceItem(item: BookmarkTreeNode | HistoryItem, category: string): SourceResponse["items"][number] {
  return {
    id: item.id,
    title: item.title ?? "",
    updated: "lastVisitTime" in item ? item.lastVisitTime ?? 0 : item.dateAdded ?? 0,
    url: item.url ?? "",
    category,
    extra: {
      icon: getFaviconURL(item.url),
    },
  }
}

export class CommandBarService {
  async googleComplete(query: string): Promise<string[]> {
    const url = `http://suggestqueries.google.com/complete/search?client=youtube&q=${encodeURIComponent(query)}&jsonp=${GOOGLE_SUGGEST_CALLBACK}`
    const response = await myFetch(url)

    try {
      return parseGoogleSuggestions(response)
    } catch {
      return []
    }
  }

  async getBookmarks(): Promise<BookmarkTreeNode[]> {
    return flattenBookmarks(await browser.bookmarks.getTree())
  }

  async getAllTabs(): Promise<browser.tabs.Tab[]> {
    return browser.tabs.query({ currentWindow: true })
  }

  async getHistory(query: string = "", maxResults: number = 100): Promise<HistoryItem[]> {
    return browser.history.search({ text: query, maxResults })
  }

  async getHistorySource(): Promise<SourceResponse> {
    return {
      status: "success",
      key: "history",
      updated: Date.now(),
      items: (await this.getHistory()).map(item => toSourceItem(item, "History")),
    }
  }

  async getBookmarksSource(): Promise<SourceResponse> {
    return {
      status: "success",
      key: "bookmarks",
      updated: Date.now(),
      items: (await this.getBookmarks()).map(item => toSourceItem(item, "Bookmark")),
    }
  }

  async openURL(url: string): Promise<void> {
    const tabs = await browser.tabs.query({ url })

    if (tabs.length > 0) {
      await browser.tabs.update(tabs[0].id!, { active: true })
      return
    }

    await browser.tabs.create({ url })
  }

  async getSource(sourceId: string): Promise<SourceResponse | undefined> {
    if (sourceId === "history") {
      return this.getHistorySource()
    }

    if (sourceId === "bookmarks") {
      return this.getBookmarksSource()
    }
  }
}

export function registerCommandBarService(): ReturnType<typeof registerService> {
  return registerService(COMMAND_BAR_SERVICE_KEY, new CommandBarService())
}

export function getCommandBarService(): ReturnType<typeof createProxyService<CommandBarService>> {
  return createProxyService<CommandBarService>(COMMAND_BAR_SERVICE_KEY)
}
