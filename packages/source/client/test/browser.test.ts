import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  browserBookmarkNodesToNewsItems,
  browserHistoryItemsToNewsItems,
  fetchBrowserBookmarks,
  fetchBrowserHistory,
} from "../src/lib/browser"

describe("browser history source", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-02T12:00:00Z"))
    Reflect.deleteProperty(globalThis, "browser")
    Reflect.deleteProperty(globalThis, "chrome")
    Object.assign(globalThis, {
      chrome: {
        runtime: {
          getURL: (path: string) => `chrome-extension://test-extension${path}`,
        },
      },
    })
  })

  it("maps browser history records to timeline news items", () => {
    expect(browserHistoryItemsToNewsItems([
      {
        url: "https://newsnext.pro/docs",
        title: "NewsNext Docs",
        lastVisitTime: Date.parse("2026-07-01T12:00:00Z"),
        visitCount: 3,
      },
      {
        url: "https://example.com/",
        lastVisitTime: Date.parse("2026-07-02T12:00:00Z"),
        visitCount: 1,
      },
      {
        url: "https://newsnext.pro/docs",
        title: "Duplicate",
      },
      {
        title: "Missing URL",
      },
    ])).toEqual([
      {
        title: "example.com",
        url: "https://example.com/",
        timestamp: Date.parse("2026-07-02T12:00:00Z"),
        inline: {
          text: "example.com · 1 visit",
          icon: {
            src: "chrome-extension://test-extension/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2F&size=64",
            radius: 4,
          },
        },
      },
      {
        title: "NewsNext Docs",
        url: "https://newsnext.pro/docs",
        timestamp: Date.parse("2026-07-01T12:00:00Z"),
        inline: {
          text: "newsnext.pro · 3 visits",
          icon: {
            src: "chrome-extension://test-extension/_favicon/?pageUrl=https%3A%2F%2Fnewsnext.pro%2Fdocs&size=64",
            radius: 4,
          },
        },
      },
    ])
  })

  it("loads history from promise-based browser API", async () => {
    const search = vi.fn().mockResolvedValue([
      {
        url: "https://newsnext.pro/",
        title: "NewsNext",
        lastVisitTime: Date.parse("2026-07-02T10:00:00Z"),
        visitCount: 2,
      },
    ])
    Object.assign(globalThis, {
      browser: {
        history: {
          search,
        },
      },
    })

    const items = await fetchBrowserHistory({
      query: "news",
      dateRange: "today",
      maxResults: 10,
    })

    expect(search).toHaveBeenCalledWith({
      text: "news",
      startTime: Date.parse("2026-07-02T00:00:00Z"),
      maxResults: 10,
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe("NewsNext")
  })

  it("loads history from callback-based chrome API", async () => {
    const search = vi.fn((_query, callback) => {
      callback?.([
        {
          url: "https://example.com/",
          title: "Example",
          lastVisitTime: Date.parse("2026-07-01T10:00:00Z"),
        },
      ])
    })
    Object.assign(globalThis, {
      chrome: {
        history: {
          search,
        },
        runtime: {
          getURL: (path: string) => `chrome-extension://test-extension${path}`,
        },
      },
    })

    const items = await fetchBrowserHistory({
      query: "example",
      dateRange: "all",
      maxResults: 5,
    })

    expect(search).toHaveBeenCalledWith({
      text: "example",
      maxResults: 5,
    }, expect.any(Function))
    expect(items[0]?.url).toBe("https://example.com/")
  })

  it("maps bookmark nodes from newest to oldest", () => {
    expect(browserBookmarkNodesToNewsItems([
      {
        id: "0",
        title: "Root",
        children: [
          {
            id: "1",
            title: "Later",
            url: "https://later.example/",
            dateAdded: Date.parse("2026-07-02T10:00:00Z"),
          },
          {
            id: "2",
            title: "Folder",
            children: [
              {
                id: "3",
                title: "Earlier",
                url: "https://earlier.example/",
                dateAdded: Date.parse("2026-07-01T10:00:00Z"),
              },
            ],
          },
        ],
      },
    ])).toEqual([
      {
        title: "Later",
        url: "https://later.example/",
        timestamp: Date.parse("2026-07-02T10:00:00Z"),
        inline: {
          text: "later.example",
          icon: {
            src: "chrome-extension://test-extension/_favicon/?pageUrl=https%3A%2F%2Flater.example%2F&size=64",
            radius: 4,
          },
        },
      },
      {
        title: "Earlier",
        url: "https://earlier.example/",
        timestamp: Date.parse("2026-07-01T10:00:00Z"),
        inline: {
          text: "earlier.example",
          icon: {
            src: "chrome-extension://test-extension/_favicon/?pageUrl=https%3A%2F%2Fearlier.example%2F&size=64",
            radius: 4,
          },
        },
      },
    ])
  })

  it("loads bookmarks from a specified folder", async () => {
    const getTree = vi.fn()
    const getSubTree = vi.fn().mockResolvedValue([
      {
        id: "10",
        title: "Reading",
        children: [
          {
            id: "11",
            title: "NewsNext",
            url: "https://newsnext.pro/",
            dateAdded: Date.parse("2026-07-02T10:00:00Z"),
          },
        ],
      },
    ])
    Object.assign(globalThis, {
      browser: {
        bookmarks: {
          getTree,
          getSubTree,
        },
      },
    })

    const items = await fetchBrowserBookmarks({
      folder: "10",
      maxResults: 10,
    })

    expect(getSubTree).toHaveBeenCalledWith("10")
    expect(getTree).not.toHaveBeenCalled()
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe("NewsNext")
  })

  it("loads bookmarks from a folder path when the folder is not an ID", async () => {
    const getSubTree = vi.fn().mockRejectedValue(new Error("Invalid bookmark id"))
    const getTree = vi.fn().mockResolvedValue([
      {
        id: "0",
        title: "",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              {
                id: "2",
                title: "Reading",
                children: [
                  {
                    id: "3",
                    title: "NewsNext",
                    url: "https://newsnext.pro/",
                    dateAdded: Date.parse("2026-07-02T10:00:00Z"),
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    Object.assign(globalThis, {
      browser: {
        bookmarks: {
          getTree,
          getSubTree,
        },
      },
    })

    const items = await fetchBrowserBookmarks({
      folder: "Bookmarks Bar/Reading",
      maxResults: 10,
    })

    expect(getSubTree).toHaveBeenCalledWith("Bookmarks Bar/Reading")
    expect(getTree).toHaveBeenCalled()
    expect(items).toHaveLength(1)
    expect(items[0]?.url).toBe("https://newsnext.pro/")
  })
})
