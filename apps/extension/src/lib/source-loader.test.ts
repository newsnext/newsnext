import { afterEach, describe, expect, it, vi } from "vitest"
import { createBackgroundClient } from "./background-client"
import { readCachedSource, writeCachedSource } from "./source-cache"
import { loadSource } from "./source-loader"

vi.mock("./background-client", () => ({
  createBackgroundClient: vi.fn(),
}))

vi.mock("./source-cache", () => ({
  readCachedSource: vi.fn(),
  writeCachedSource: vi.fn(),
}))

const createBackgroundClientMock = vi.mocked(createBackgroundClient)
const readCachedSourceMock = vi.mocked(readCachedSource)
const writeCachedSourceMock = vi.mocked(writeCachedSource)

describe("loadSource", () => {
  afterEach(() => {
    createBackgroundClientMock.mockReset()
    readCachedSourceMock.mockReset()
    writeCachedSourceMock.mockReset()
  })

  it("loads source data through the extension background when available", async () => {
    readCachedSourceMock.mockResolvedValue(undefined)
    const load = vi.fn().mockResolvedValue({
      items: [{ title: "Loaded in background", url: "https://example.com" }],
      updatedAt: 123,
    })

    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    const result = await loadSource("github:trending", { dateRange: "weekly" })

    expect(load).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(result.key).toMatch(/^github:trending:/)
    expect(result).toMatchObject({
      updatedAt: 123,
      items: [{ title: "Loaded in background", url: "https://example.com" }],
    })
    expect(writeCachedSource).toHaveBeenCalledWith(result)
  })

  it("sends original query params to the background", async () => {
    readCachedSourceMock.mockResolvedValue(undefined)
    const load = vi.fn().mockResolvedValue({
      items: [{ title: "Song", url: "https://music.163.com/song?id=1" }],
      updatedAt: 123,
    })

    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    await loadSource("netease-music:playlist", {
      id: " 5059661515 ",
    })

    expect(load).toHaveBeenCalledWith({
      sourceId: "netease-music:playlist",
      params: {
        id: " 5059661515 ",
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

    readCachedSourceMock.mockResolvedValue(cachedResult)

    const result = await loadSource("github:trending", { dateRange: "weekly" })

    expect(result).toBe(cachedResult)
    expect(readCachedSource).toHaveBeenCalledWith(expect.stringMatching(/^github:trending:/), 60_000)
    expect(createBackgroundClient).not.toHaveBeenCalled()
    expect(writeCachedSource).not.toHaveBeenCalled()
  })

  it("skips cached source data when fresh data is forced", async () => {
    const cachedResult = {
      id: "github:trending",
      key: "github:trending:cached",
      items: [{ title: "Cached", url: "https://example.com/cached" }],
      updatedAt: 456,
    }
    const load = vi.fn().mockResolvedValue({
      items: [{ title: "Fresh", url: "https://example.com/fresh" }],
      updatedAt: 789,
    })

    readCachedSourceMock.mockResolvedValue(cachedResult)
    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    const result = await loadSource("github:trending", { dateRange: "weekly" }, { forceFresh: true })

    expect(readCachedSource).not.toHaveBeenCalled()
    expect(load).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(result).toMatchObject({
      updatedAt: 789,
      items: [{ title: "Fresh", url: "https://example.com/fresh" }],
    })
  })

  it("reloads source data when the cached result is empty", async () => {
    const load = vi.fn().mockResolvedValue({
      items: [{ title: "Fresh", url: "https://example.com/fresh" }],
      updatedAt: 789,
    })

    readCachedSourceMock.mockResolvedValue({
      id: "github:trending",
      key: "github:trending:cached",
      items: [],
      updatedAt: 456,
    })
    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    const result = await loadSource("github:trending", { dateRange: "weekly" })

    expect(load).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(result.items).toEqual([{ title: "Fresh", url: "https://example.com/fresh" }])
  })

  it("throws when fresh source data is empty", async () => {
    readCachedSourceMock.mockResolvedValue(undefined)
    const load = vi.fn().mockResolvedValue({
      items: [],
      updatedAt: 789,
    })

    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    await expect(loadSource("github:trending", { dateRange: "weekly" }))
      .rejects
      .toThrow("No source items. Refresh to try again.")

    expect(load).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(writeCachedSource).not.toHaveBeenCalled()
  })

  it("dedupes concurrent source loads for the same cache key", async () => {
    readCachedSourceMock.mockResolvedValue(undefined)
    const load = vi.fn().mockResolvedValue({
      items: [{ title: "Concurrent", url: "https://example.com/concurrent" }],
      updatedAt: 789,
    })

    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    const [firstResult, secondResult] = await Promise.all([
      loadSource("github:trending", { dateRange: "weekly" }),
      loadSource("github:trending", { dateRange: "weekly" }),
    ])

    expect(firstResult).toEqual(secondResult)
    expect(load).toHaveBeenCalledTimes(1)
    expect(writeCachedSource).toHaveBeenCalledTimes(1)
  })
})
