import { beforeEach, describe, expect, it, vi } from "vitest"

const browserMock = vi.hoisted(() => ({
  scripting: {
    executeScript: vi.fn(),
  },
  tabs: {
    executeScript: vi.fn(),
    sendMessage: vi.fn(),
  },
}))

vi.mock("#imports", () => ({
  browser: browserMock,
}))

const { toggleRadarOverlay } = await import("./radar-overlay")

beforeEach(() => {
  browserMock.scripting.executeScript.mockReset()
  browserMock.tabs.executeScript.mockReset()
  browserMock.tabs.sendMessage.mockReset()
})

describe("toggleRadarOverlay", () => {
  it("toggles an existing content script without reinjecting it", async () => {
    browserMock.tabs.sendMessage.mockResolvedValue(undefined)

    await toggleRadarOverlay({ id: 7 }, 3)

    expect(browserMock.tabs.sendMessage).toHaveBeenCalledOnce()
    expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
  })

  it("injects the content script before toggling it in Manifest V3", async () => {
    browserMock.tabs.sendMessage
      .mockRejectedValueOnce(new Error("No receiver"))
      .mockResolvedValueOnce(undefined)
    browserMock.scripting.executeScript.mockResolvedValue([])

    await toggleRadarOverlay({ id: 7 }, 3)

    expect(browserMock.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ["/content-scripts/radar-trigger.js"],
    })
    expect(browserMock.tabs.sendMessage).toHaveBeenCalledTimes(2)
  })

  it("uses the tabs injection API in Manifest V2", async () => {
    browserMock.tabs.sendMessage
      .mockRejectedValueOnce(new Error("No receiver"))
      .mockResolvedValueOnce(undefined)
    browserMock.tabs.executeScript.mockResolvedValue([])

    await toggleRadarOverlay({ id: 7 }, 2)

    expect(browserMock.tabs.executeScript).toHaveBeenCalledWith(7, {
      file: "/content-scripts/radar-trigger.js",
    })
    expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
  })
})
