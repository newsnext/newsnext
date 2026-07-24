import { beforeEach, describe, expect, it, vi } from "vitest"

const browserMock = vi.hoisted(() => ({
  bookmarks: {
    getSubTree: vi.fn(),
    getTree: vi.fn(),
  },
  history: {
    search: vi.fn(),
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://newsnext${path}`),
  },
}))

vi.mock("@wxt-dev/browser", () => ({
  browser: browserMock,
}))

const { default: provider } = await import("./browser")

describe("browser sources", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads history through the WXT browser API", async () => {
    browserMock.history.search.mockResolvedValue([
      {
        id: "history-1",
        title: "Example",
        url: "https://example.com/article",
        lastVisitTime: 100,
        visitCount: 2,
      },
    ])

    const items = await provider.sources.history.loader({
      query: " example ",
      dateRange: "all",
      maxResults: 20,
    })

    expect(browserMock.history.search).toHaveBeenCalledWith({
      text: "example",
      maxResults: 20,
    })
    expect(items).toEqual([
      expect.objectContaining({
        title: "Example",
        url: "https://example.com/article",
        timestamp: 100,
      }),
    ])
  })

  it("resolves bookmark folders through the WXT browser API", async () => {
    browserMock.bookmarks.getSubTree.mockRejectedValue(new Error("Unknown bookmark ID"))
    browserMock.bookmarks.getTree.mockResolvedValue([
      {
        id: "root",
        title: "",
        syncing: false,
        children: [{
          id: "work",
          title: "Work",
          syncing: false,
          children: [{
            id: "bookmark-1",
            title: "Example",
            url: "https://example.com",
            dateAdded: 200,
            syncing: false,
          }],
        }],
      },
    ])

    const items = await provider.sources.bookmarks.loader({
      folder: "Work",
      maxResults: 10,
    })

    expect(browserMock.bookmarks.getSubTree).toHaveBeenCalledWith("Work")
    expect(browserMock.bookmarks.getTree).toHaveBeenCalledOnce()
    expect(items).toEqual([
      expect.objectContaining({
        title: "Example",
        url: "https://example.com",
        timestamp: 200,
      }),
    ])
  })
})
