import { describe, expect, it, vi } from "vitest"

const { browserMock, mocks } = vi.hoisted(() => {
  const mocks = {
    getSuggestions: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setBadgeText: vi.fn(),
    tabsQuery: vi.fn(),
  }

  return {
    mocks,
    browserMock: {
      action: {
        setBadgeBackgroundColor: mocks.setBadgeBackgroundColor,
        setBadgeText: mocks.setBadgeText,
      },
      tabs: {
        onActivated: {
          addListener: vi.fn(),
        },
        onUpdated: {
          addListener: vi.fn(),
        },
        query: mocks.tabsQuery,
      },
    },
  }
})

vi.mock("#imports", () => ({
  browser: browserMock,
}))

vi.mock("@/lib/radar", () => ({
  createRadarMatcher: () => ({
    getSuggestions: mocks.getSuggestions,
  }),
}))

vi.mock("@/lib/sources", () => ({
  getSourceDescriptors: () => [],
}))

const { registerRadarBadge } = await import("./radar-badge")

describe("registerRadarBadge", () => {
  it("updates the active tab badge without consulting optional settings", async () => {
    mocks.tabsQuery.mockResolvedValue([
      { id: 7, title: "Radar source", url: "https://example.com/radar" },
    ])
    mocks.getSuggestions.mockReturnValue([{}, {}])
    mocks.setBadgeText.mockResolvedValue(undefined)
    mocks.setBadgeBackgroundColor.mockResolvedValue(undefined)

    registerRadarBadge()

    await vi.waitFor(() => {
      expect(mocks.setBadgeText).toHaveBeenCalledWith({
        tabId: 7,
        text: "2",
      })
    })
    expect(mocks.getSuggestions).toHaveBeenCalledWith({
      title: "Radar source",
      url: "https://example.com/radar",
    })
    expect(mocks.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 7,
      color: "#ef4444",
    })
  })
})
