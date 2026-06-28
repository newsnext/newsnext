import { afterEach, describe, expect, it, vi } from "vitest"
import { createBackgroundClient } from "./background-client"
import { readCachedLocalSource, writeCachedLocalSource } from "./local-source-cache"
import { loadLocalSource } from "./local-source-loader"

vi.mock("./background-client", () => ({
  createBackgroundClient: vi.fn(),
}))

vi.mock("./local-source-cache", () => ({
  readCachedLocalSource: vi.fn(),
  writeCachedLocalSource: vi.fn(),
}))

const createBackgroundClientMock = vi.mocked(createBackgroundClient)
const readCachedLocalSourceMock = vi.mocked(readCachedLocalSource)
const writeCachedLocalSourceMock = vi.mocked(writeCachedLocalSource)

describe("loadLocalSource", () => {
  afterEach(() => {
    createBackgroundClientMock.mockReset()
    readCachedLocalSourceMock.mockReset()
    writeCachedLocalSourceMock.mockReset()
  })

  it("loads source data through the extension background when available", async () => {
    readCachedLocalSourceMock.mockResolvedValue(undefined)
    const loadSource = vi.fn().mockResolvedValue({
      items: [{ title: "Loaded in background", url: "https://example.com" }],
      updated: 123,
    })

    createBackgroundClientMock.mockReturnValue({ loadSource } as never)

    const result = await loadLocalSource("github:default", { dateRange: "weekly" })

    expect(loadSource).toHaveBeenCalledWith({
      sourceId: "github:default",
      params: { dateRange: "weekly" },
    })
    expect(result.key).toMatch(/^github:default:/)
    expect(result).toMatchObject({
      updated: 123,
      items: [{ title: "Loaded in background", url: "https://example.com" }],
    })
    expect(writeCachedLocalSource).toHaveBeenCalledWith(result)
  })

  it("sends JSON params to the background before local normalization", async () => {
    readCachedLocalSourceMock.mockResolvedValue(undefined)
    const loadSource = vi.fn().mockResolvedValue({
      items: [{ title: "V2EX", url: "https://www.v2ex.com/t/1" }],
      updated: 123,
    })

    createBackgroundClientMock.mockReturnValue({ loadSource } as never)

    await loadLocalSource("json:default", {
      url: "https://www.v2ex.com/feed/ideas.json",
      headers: "{}",
    })

    expect(loadSource).toHaveBeenCalledWith({
      sourceId: "json:default",
      params: {
        url: "https://www.v2ex.com/feed/ideas.json",
        headers: "{}",
      },
    })
  })

  it("returns fresh cached source data without requesting the background", async () => {
    const cachedResult = {
      id: "github:default",
      key: "github:default:cached",
      items: [{ title: "Cached", url: "https://example.com/cached" }],
      updated: 456,
    }

    readCachedLocalSourceMock.mockResolvedValue(cachedResult)

    const result = await loadLocalSource("github:default", { dateRange: "weekly" })

    expect(result).toBe(cachedResult)
    expect(readCachedLocalSource).toHaveBeenCalledWith(expect.stringMatching(/^github:default:/), 60_000)
    expect(createBackgroundClient).not.toHaveBeenCalled()
    expect(writeCachedLocalSource).not.toHaveBeenCalled()
  })

  it("dedupes concurrent source loads for the same cache key", async () => {
    readCachedLocalSourceMock.mockResolvedValue(undefined)
    const loadSource = vi.fn().mockResolvedValue({
      items: [{ title: "Concurrent", url: "https://example.com/concurrent" }],
      updated: 789,
    })

    createBackgroundClientMock.mockReturnValue({ loadSource } as never)

    const [firstResult, secondResult] = await Promise.all([
      loadLocalSource("github:default", { dateRange: "weekly" }),
      loadLocalSource("github:default", { dateRange: "weekly" }),
    ])

    expect(firstResult).toEqual(secondResult)
    expect(loadSource).toHaveBeenCalledTimes(1)
    expect(writeCachedLocalSource).toHaveBeenCalledTimes(1)
  })
})
