import { beforeEach, describe, expect, it, vi } from "vitest"

const browserMock = vi.hoisted(() => ({
  action: {
    setBadgeText: vi.fn(),
  },
  permissions: {
    contains: vi.fn(),
    remove: vi.fn(),
    request: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
  },
}))

vi.mock("#imports", () => ({
  browser: browserMock,
}))

const {
  clearRadarBadges,
  disableRadarBadge,
  enableRadarBadge,
  isRadarBadgeActive,
  RADAR_BADGE_ENABLED_KEY,
} = await import("./radar-badge-settings")

beforeEach(() => {
  browserMock.action.setBadgeText.mockReset()
  browserMock.permissions.contains.mockReset()
  browserMock.permissions.remove.mockReset()
  browserMock.permissions.request.mockReset()
  browserMock.storage.local.get.mockReset()
  browserMock.storage.local.set.mockReset()
  browserMock.tabs.query.mockReset()
})

describe("radar badge settings", () => {
  it("is active only when the setting and tabs permission are enabled", async () => {
    browserMock.storage.local.get.mockResolvedValue({
      [RADAR_BADGE_ENABLED_KEY]: true,
    })
    browserMock.permissions.contains.mockResolvedValue(true)

    await expect(isRadarBadgeActive()).resolves.toBe(true)

    browserMock.permissions.contains.mockResolvedValue(false)
    await expect(isRadarBadgeActive()).resolves.toBe(false)
  })

  it("stores the setting only after tabs permission is granted", async () => {
    browserMock.permissions.request.mockResolvedValue(true)
    browserMock.storage.local.set.mockResolvedValue(undefined)

    await expect(enableRadarBadge()).resolves.toBe(true)
    expect(browserMock.permissions.request).toHaveBeenCalledWith({
      permissions: ["tabs"],
    })
    expect(browserMock.storage.local.set).toHaveBeenCalledWith({
      [RADAR_BADGE_ENABLED_KEY]: true,
    })
  })

  it("keeps the setting disabled when tabs permission is denied", async () => {
    browserMock.permissions.request.mockResolvedValue(false)

    await expect(enableRadarBadge()).resolves.toBe(false)
    expect(browserMock.storage.local.set).not.toHaveBeenCalled()
  })

  it("clears badges before disabling and revoking tabs permission", async () => {
    browserMock.tabs.query.mockResolvedValue([{ id: 3 }, { id: 7 }])
    browserMock.action.setBadgeText.mockResolvedValue(undefined)
    browserMock.storage.local.set.mockResolvedValue(undefined)
    browserMock.permissions.remove.mockResolvedValue(true)

    await disableRadarBadge()

    expect(browserMock.action.setBadgeText).toHaveBeenCalledWith({ tabId: 3, text: "" })
    expect(browserMock.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: "" })
    expect(browserMock.storage.local.set).toHaveBeenCalledWith({
      [RADAR_BADGE_ENABLED_KEY]: false,
    })
    expect(browserMock.permissions.remove).toHaveBeenCalledWith({
      permissions: ["tabs"],
    })
  })

  it("clears every per-tab badge", async () => {
    browserMock.tabs.query.mockResolvedValue([{ id: 3 }, {}, { id: 7 }])
    browserMock.action.setBadgeText.mockResolvedValue(undefined)

    await clearRadarBadges()

    expect(browserMock.action.setBadgeText).toHaveBeenCalledTimes(2)
  })
})
