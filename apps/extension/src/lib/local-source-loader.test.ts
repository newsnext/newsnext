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
      updatedAt: 123,
    })

    createBackgroundClientMock.mockReturnValue({ loadSource } as never)

    const result = await loadLocalSource("github:trending", { dateRange: "weekly" })

    expect(loadSource).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(result.key).toMatch(/^github:trending:/)
    expect(result).toMatchObject({
      updatedAt: 123,
      items: [{ title: "Loaded in background", url: "https://example.com" }],
    })
    expect(writeCachedLocalSource).toHaveBeenCalledWith(result)
  })

  it("sends query params to the background before local normalization", async () => {
    readCachedLocalSourceMock.mockResolvedValue(undefined)
    const loadSource = vi.fn().mockResolvedValue({
      items: [{ title: "Song", url: "https://music.163.com/song?id=1" }],
      updatedAt: 123,
    })

    createBackgroundClientMock.mockReturnValue({ loadSource } as never)

    await loadLocalSource("netease-music:playlist", {
      id: "https://music.163.com/playlist?id=5059661515",
    })

    expect(loadSource).toHaveBeenCalledWith({
      sourceId: "netease-music:playlist",
      params: {
        id: "https://music.163.com/playlist?id=5059661515",
      },
    })
  })

  it("returns fresh cached source data without requesting the background", async () => {
    const cachedResult = {
      id: "github:trending",
      key: "github:trending:cached",
      items: [{ title: "Cached", url: "https://example.com/cached" }],
      updatedAt: 456,
    }

    readCachedLocalSourceMock.mockResolvedValue(cachedResult)

    const result = await loadLocalSource("github:trending", { dateRange: "weekly" })

    expect(result).toBe(cachedResult)
    expect(readCachedLocalSource).toHaveBeenCalledWith(expect.stringMatching(/^github:trending:/), 60_000)
    expect(createBackgroundClient).not.toHaveBeenCalled()
    expect(writeCachedLocalSource).not.toHaveBeenCalled()
  })

  it("skips cached source data when fresh data is forced", async () => {
    const cachedResult = {
      id: "github:trending",
      key: "github:trending:cached",
      items: [{ title: "Cached", url: "https://example.com/cached" }],
      updatedAt: 456,
    }
    const loadSource = vi.fn().mockResolvedValue({
      items: [{ title: "Fresh", url: "https://example.com/fresh" }],
      updatedAt: 789,
    })

    readCachedLocalSourceMock.mockResolvedValue(cachedResult)
    createBackgroundClientMock.mockReturnValue({ loadSource } as never)

    const result = await loadLocalSource("github:trending", { dateRange: "weekly" }, { forceFresh: true })

    expect(readCachedLocalSource).not.toHaveBeenCalled()
    expect(loadSource).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(result).toMatchObject({
      updatedAt: 789,
      items: [{ title: "Fresh", url: "https://example.com/fresh" }],
    })
  })

  it("reloads source data when the cached result is empty", async () => {
    const loadSource = vi.fn().mockResolvedValue({
      items: [{ title: "Fresh", url: "https://example.com/fresh" }],
      updatedAt: 789,
    })

    readCachedLocalSourceMock.mockResolvedValue({
      id: "github:trending",
      key: "github:trending:cached",
      items: [],
      updatedAt: 456,
    })
    createBackgroundClientMock.mockReturnValue({ loadSource } as never)

    const result = await loadLocalSource("github:trending", { dateRange: "weekly" })

    expect(loadSource).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(result.items).toEqual([{ title: "Fresh", url: "https://example.com/fresh" }])
  })

  it("dedupes concurrent source loads for the same cache key", async () => {
    readCachedLocalSourceMock.mockResolvedValue(undefined)
    const loadSource = vi.fn().mockResolvedValue({
      items: [{ title: "Concurrent", url: "https://example.com/concurrent" }],
      updatedAt: 789,
    })

    createBackgroundClientMock.mockReturnValue({ loadSource } as never)

    const [firstResult, secondResult] = await Promise.all([
      loadLocalSource("github:trending", { dateRange: "weekly" }),
      loadLocalSource("github:trending", { dateRange: "weekly" }),
    ])

    expect(firstResult).toEqual(secondResult)
    expect(loadSource).toHaveBeenCalledTimes(1)
    expect(writeCachedLocalSource).toHaveBeenCalledTimes(1)
  })
})
