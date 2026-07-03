import { afterEach, describe, expect, it, vi } from "vitest"
import { createBackgroundClient } from "./background-client"
import { readCachedClientSource, writeCachedClientSource } from "./client-source-cache"
import { loadClientSource } from "./client-source-loader"

vi.mock("./background-client", () => ({
  createBackgroundClient: vi.fn(),
}))

vi.mock("./client-source-cache", () => ({
  readCachedClientSource: vi.fn(),
  writeCachedClientSource: vi.fn(),
}))

const createBackgroundClientMock = vi.mocked(createBackgroundClient)
const readCachedClientSourceMock = vi.mocked(readCachedClientSource)
const writeCachedClientSourceMock = vi.mocked(writeCachedClientSource)

describe("loadClientSource", () => {
  afterEach(() => {
    createBackgroundClientMock.mockReset()
    readCachedClientSourceMock.mockReset()
    writeCachedClientSourceMock.mockReset()
  })

  it("loads source data through the extension background when available", async () => {
    readCachedClientSourceMock.mockResolvedValue(undefined)
    const load = vi.fn().mockResolvedValue({
      items: [{ title: "Loaded in background", url: "https://example.com" }],
      updatedAt: 123,
    })

    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    const result = await loadClientSource("github:trending", { dateRange: "weekly" })

    expect(load).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(result.key).toMatch(/^github:trending:/)
    expect(result).toMatchObject({
      updatedAt: 123,
      items: [{ title: "Loaded in background", url: "https://example.com" }],
    })
    expect(writeCachedClientSource).toHaveBeenCalledWith(result)
  })

  it("sends query params to the background before local normalization", async () => {
    readCachedClientSourceMock.mockResolvedValue(undefined)
    const load = vi.fn().mockResolvedValue({
      items: [{ title: "Song", url: "https://music.163.com/song?id=1" }],
      updatedAt: 123,
    })

    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    await loadClientSource("netease-music:playlist", {
      id: "https://music.163.com/playlist?id=5059661515",
    })

    expect(load).toHaveBeenCalledWith({
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

    readCachedClientSourceMock.mockResolvedValue(cachedResult)

    const result = await loadClientSource("github:trending", { dateRange: "weekly" })

    expect(result).toBe(cachedResult)
    expect(readCachedClientSource).toHaveBeenCalledWith(expect.stringMatching(/^github:trending:/), 60_000)
    expect(createBackgroundClient).not.toHaveBeenCalled()
    expect(writeCachedClientSource).not.toHaveBeenCalled()
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

    readCachedClientSourceMock.mockResolvedValue(cachedResult)
    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    const result = await loadClientSource("github:trending", { dateRange: "weekly" }, { forceFresh: true })

    expect(readCachedClientSource).not.toHaveBeenCalled()
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

    readCachedClientSourceMock.mockResolvedValue({
      id: "github:trending",
      key: "github:trending:cached",
      items: [],
      updatedAt: 456,
    })
    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    const result = await loadClientSource("github:trending", { dateRange: "weekly" })

    expect(load).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(result.items).toEqual([{ title: "Fresh", url: "https://example.com/fresh" }])
  })

  it("throws when fresh source data is empty", async () => {
    readCachedClientSourceMock.mockResolvedValue(undefined)
    const load = vi.fn().mockResolvedValue({
      items: [],
      updatedAt: 789,
    })

    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    await expect(loadClientSource("github:trending", { dateRange: "weekly" }))
      .rejects
      .toThrow("No source items. Refresh to try again.")

    expect(load).toHaveBeenCalledWith({
      sourceId: "github:trending",
      params: { dateRange: "weekly" },
    })
    expect(writeCachedClientSource).not.toHaveBeenCalled()
  })

  it("dedupes concurrent source loads for the same cache key", async () => {
    readCachedClientSourceMock.mockResolvedValue(undefined)
    const load = vi.fn().mockResolvedValue({
      items: [{ title: "Concurrent", url: "https://example.com/concurrent" }],
      updatedAt: 789,
    })

    createBackgroundClientMock.mockReturnValue({ source: { load } } as never)

    const [firstResult, secondResult] = await Promise.all([
      loadClientSource("github:trending", { dateRange: "weekly" }),
      loadClientSource("github:trending", { dateRange: "weekly" }),
    ])

    expect(firstResult).toEqual(secondResult)
    expect(load).toHaveBeenCalledTimes(1)
    expect(writeCachedClientSource).toHaveBeenCalledTimes(1)
  })
})
