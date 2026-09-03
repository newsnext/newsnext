import { beforeEach, describe, expect, it, vi } from "vitest"

const browserMock = vi.hoisted(() => ({
  listeners: [] as Array<(changes: Record<string, { newValue?: unknown }>, area: string) => void>,
  storage: {
    local: {
      get: vi.fn(),
      remove: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
}))

vi.mock("#imports", () => ({ browser: { storage: browserMock.storage } }))

const { createExtensionStorage } = await import("./persisted-storage")

describe("extension persisted storage", () => {
  beforeEach(() => {
    browserMock.listeners.length = 0
    browserMock.storage.local.get.mockReset().mockResolvedValue({ setting: 1 })
    browserMock.storage.local.remove.mockReset().mockResolvedValue(undefined)
    browserMock.storage.local.set.mockReset().mockResolvedValue(undefined)
    browserMock.storage.onChanged.addListener.mockReset().mockImplementation((listener) => {
      browserMock.listeners.push(listener)
    })
  })

  it("tracks extension storage changes before a UI atom subscribes", async () => {
    const storage = createExtensionStorage({
      defaultValue: () => 0,
      key: "setting",
      normalize: value => typeof value === "number" ? value : 0,
    })
    await storage.initialize()

    browserMock.listeners[0]?.({ setting: { newValue: 2 } }, "local")

    expect(storage.getItem("setting", 0)).toBe(2)
  })
})
