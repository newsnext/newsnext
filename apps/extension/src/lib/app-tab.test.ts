import { beforeEach, describe, expect, it, vi } from "vitest"

const browserMock = vi.hoisted(() => ({
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://newsnext${path}`),
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn(),
    update: vi.fn(),
  },
  windows: {
    update: vi.fn(),
  },
}))

vi.mock("#imports", () => ({ browser: browserMock }))

beforeEach(() => {
  vi.clearAllMocks()
  browserMock.tabs.create.mockResolvedValue({})
  browserMock.tabs.update.mockResolvedValue({})
  browserMock.windows.update.mockResolvedValue({})
})

describe("openAppTab", () => {
  it("creates the requested app URL when no app tab exists", async () => {
    browserMock.tabs.query.mockResolvedValue([])
    const { openAppTab } = await import("./app-tab")
    const targetUrl = "chrome-extension://newsnext/app.html#/board/target"

    await openAppTab(targetUrl)

    expect(browserMock.tabs.create).toHaveBeenCalledWith({ url: targetUrl })
  })

  it("updates an existing app tab before focusing its window", async () => {
    browserMock.tabs.query.mockResolvedValue([{
      active: true,
      id: 42,
      url: "chrome-extension://newsnext/app.html#/board/current",
      windowId: 7,
    }])
    const { openAppTab } = await import("./app-tab")
    const targetUrl = "chrome-extension://newsnext/app.html#/board/target"

    await openAppTab(targetUrl)

    expect(browserMock.tabs.update).toHaveBeenCalledWith(42, {
      active: true,
      url: targetUrl,
    })
    expect(browserMock.windows.update).toHaveBeenCalledWith(7, { focused: true })
    expect(browserMock.tabs.update.mock.invocationCallOrder[0])
      .toBeLessThan(browserMock.windows.update.mock.invocationCallOrder[0]!)
  })

  it("only focuses an app tab that is already at the requested URL", async () => {
    const targetUrl = "chrome-extension://newsnext/app.html#/board/target"
    browserMock.tabs.query.mockResolvedValue([{
      active: false,
      id: 42,
      url: targetUrl,
      windowId: 7,
    }])
    const { openAppTab } = await import("./app-tab")

    await openAppTab(targetUrl)

    expect(browserMock.tabs.update).toHaveBeenCalledWith(42, { active: true })
    expect(browserMock.windows.update).toHaveBeenCalledWith(7, { focused: true })
  })
})

describe("openAppBoard", () => {
  it("creates the requested board route when no app tab exists", async () => {
    browserMock.tabs.query.mockResolvedValue([])
    const { openAppBoard } = await import("./app-tab")

    await openAppBoard("target/board")

    expect(browserMock.tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://newsnext/app.html#/board/target%2Fboard",
    })
  })

  it("focuses an existing app tab without changing its URL", async () => {
    browserMock.tabs.query.mockResolvedValue([{
      active: true,
      id: 42,
      url: "chrome-extension://newsnext/app.html#/board/current",
      windowId: 7,
    }])
    const { openAppBoard } = await import("./app-tab")

    await openAppBoard("target")

    expect(browserMock.tabs.update).toHaveBeenCalledWith(42, { active: true })
    expect(browserMock.windows.update).toHaveBeenCalledWith(7, { focused: true })
  })
})
