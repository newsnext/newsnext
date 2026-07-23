import { beforeEach, describe, expect, it, vi } from "vitest"

const store = new Map<string, unknown>()
const put = vi.fn(async (storeName: string, value: unknown, key?: string) => {
  store.set(key ?? storeName, value)
})
const get = vi.fn(async (key: string) => store.get(key))
const objectStore = vi.fn(() => ({ get, put }))
const transaction = vi.fn(() => ({
  objectStore,
  done: Promise.resolve(),
}))

vi.mock("idb", () => ({
  openDB: vi.fn(async () => ({
    objectStoreNames: {
      contains: () => true,
    },
    transaction,
    put,
  })),
}))

describe("source cache", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", {})
    store.clear()
    put.mockClear()
    get.mockClear()
    objectStore.mockClear()
    transaction.mockClear()
  })

  it("stores cache entries with an out-of-line key", async () => {
    const { readCachedSource, writeCachedSource } = await import("./source-cache")

    await writeCachedSource({
      id: "github:trending",
      key: "github:trending:v1:{}",
      items: [{ title: "Cached", url: "https://example.com" }],
      updatedAt: 123,
    }, 456)

    expect(put).toHaveBeenCalledWith("source-results", {
      id: "github:trending",
      items: [{ title: "Cached", url: "https://example.com" }],
      updatedAt: 123,
      cachedAt: 456,
      usedAt: 456,
    }, "github:trending:v1:{}")

    const cached = await readCachedSource("github:trending:v1:{}", 60_000, 789)

    expect(cached).toEqual({
      id: "github:trending",
      key: "github:trending:v1:{}",
      items: [{ title: "Cached", url: "https://example.com" }],
      updatedAt: 123,
    })
  })
})
