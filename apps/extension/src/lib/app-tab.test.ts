import { beforeEach, describe, expect, it, vi } from "vitest"

const browserMock = vi.hoisted(() => ({
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://newsnext${path}`),
    sendMessage: vi.fn(),
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
  browserMock.runtime.sendMessage.mockResolvedValue(undefined)
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

describe("openAppSettings", () => {
  it("creates the app with a Settings intent when no app tab exists", async () => {
    browserMock.tabs.query.mockResolvedValue([])
    const { openAppSettings } = await import("./app-tab")

    await openAppSettings()

    expect(browserMock.tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://newsnext/app.html?settings=cli",
    })
  })

  it("focuses an existing app tab and requests Settings without navigating", async () => {
    browserMock.tabs.query.mockResolvedValue([{
      active: true,
      id: 42,
      url: "chrome-extension://newsnext/app.html#/board/current",
      windowId: 7,
    }])
    const { openAppSettings } = await import("./app-tab")

    await openAppSettings()

    expect(browserMock.tabs.update).toHaveBeenCalledWith(42, { active: true })
    expect(browserMock.windows.update).toHaveBeenCalledWith(7, { focused: true })
    expect(browserMock.runtime.sendMessage).toHaveBeenCalledWith({
      tab: "cli",
      type: "settings.open",
    })
    expect(browserMock.tabs.create).not.toHaveBeenCalled()
  })
})
