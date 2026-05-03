import type { SourceResponse } from "@newsnext/shared/types"
import { createProxyService, registerService } from "@webext-core/proxy-service"
import { browser } from "wxt/browser"
import { myFetch } from "@/lib/utils"

class CommandBarService {
  async googleComplete(query: string) {
    const key = "window.google.ac.h"
    const sugurl = `http://suggestqueries.google.com/complete/search?client=youtube&q=${encodeURIComponent(query)}&jsonp=${key}`
    const res = await myFetch(sugurl)
    try {
      return JSON.parse(res.replace(key, "").slice(1, -1))[1].map((k: any) => k[0]) as string[]
    } catch {
      return []
    }
  }

  async getBookmarks() {
    const tree = await browser.bookmarks.getTree()
    type BookmarkTreeNode = typeof tree[number]
    const bookmarks: BookmarkTreeNode[] = []
    function inDeep(tree: BookmarkTreeNode[]) {
      tree.forEach((item) => {
        if (item.children) {
          inDeep(item.children)
        } else {
          bookmarks.push(item)
        }
      })
    }
    inDeep(tree)
    return bookmarks
  }

  async getAllTabs() {
    const tabs = await browser.tabs.query({
      currentWindow: true,
    })
    return tabs
  }

  async getHistory(query: string = "", maxResults: number = 100) {
    const history = await browser.history.search({ text: query, maxResults })
    return history
  }

  async getHistorySource(): Promise<SourceResponse> {
    return {
      status: "success",
      key: "history",
      updated: Date.now(),
      items: (await this.getHistory()).map(item => ({
        id: item.id,
        title: item.title ?? "",
        updated: item.lastVisitTime ?? 0,
        url: item.url ?? "",
        category: "History",
        extra: {
          icon: `https://icons.duckduckgo.com/ip3/${new URL(item.url!).hostname}.ico`,
        },
      })),
    }
  }

  async getBookmarksSource(): Promise<SourceResponse> {
    return {
      status: "success",
      key: "bookmarks",
      updated: Date.now(),
      items: (await this.getBookmarks()).map(item => ({
        id: item.id,
        title: item.title ?? "",
        updated: item.dateAdded ?? 0,
        url: item.url ?? "",
        category: "Bookmark",
        extra: {
          icon: `https://icons.duckduckgo.com/ip3/${new URL(item.url!).hostname}.ico`,
        },
      })),
    }
  }

  async openURL(url: string) {
    const tabs = await browser.tabs.query({ url })
    if (tabs.length > 0) {
      await browser.tabs.update(tabs[0].id!, { active: true })
    } else {
      await browser.tabs.create({ url })
    }
  }

  async getSource(sourceId: string) {
    if (sourceId === "history") {
      return this.getHistorySource()
    }
    if (sourceId === "bookmarks") {
      return this.getBookmarksSource()
    }
  }
}

const commandBarServiceKey = "CommandBarService"

export function registerCommandBarService(): ReturnType<typeof registerService> {
  return registerService(commandBarServiceKey, new CommandBarService())
}

export function getCommandBarService(): ReturnType<typeof createProxyService<CommandBarService>> {
  return createProxyService<CommandBarService>(commandBarServiceKey)
}
