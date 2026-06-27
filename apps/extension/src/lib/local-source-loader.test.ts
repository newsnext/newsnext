import { afterEach, describe, expect, it, vi } from "vitest"
import { createBackgroundClient } from "./background-client"
import { loadLocalSource } from "./local-source-loader"

vi.mock("./background-client", () => ({
  createBackgroundClient: vi.fn(),
}))

const createBackgroundClientMock = vi.mocked(createBackgroundClient)

describe("loadLocalSource", () => {
  afterEach(() => {
    createBackgroundClientMock.mockReset()
  })

  it("loads source data through the extension background when available", async () => {
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
  })

  it("sends JSON params to the background before local normalization", async () => {
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
})
