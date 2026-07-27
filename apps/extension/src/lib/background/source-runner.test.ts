import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  browserMock,
  loadSourceDescriptorsMock,
  myFetchMock,
  prepareSourceRequestMock,
} = vi.hoisted(() => ({
  browserMock: {
    cookies: {
      get: vi.fn(),
    },
    scripting: {
      executeScript: vi.fn(),
    },
    tabs: {
      query: vi.fn(),
    },
  },
  loadSourceDescriptorsMock: vi.fn(),
  myFetchMock: vi.fn(),
  prepareSourceRequestMock: vi.fn(),
}))

vi.mock("#imports", () => ({
  browser: browserMock,
}))

vi.mock("@newsnext/source/utils/fetch", () => ({
  myFetch: myFetchMock,
}))

vi.mock("@newsnext/source/service", async (importOriginal) => {
  const original = await importOriginal<typeof import("@newsnext/source/service")>()
  return {
    ...original,
    loadSourceDescriptors: loadSourceDescriptorsMock,
    prepareSourceRequest: prepareSourceRequestMock,
  }
})

const {
  getConnectedSourceSecretProviderId,
  listConnectedSources,
  runConnectedSource,
} = await import("./source-runner")

describe("connected source execution", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("isolates CLI secrets unless provider secrets are explicitly requested", () => {
    expect(getConnectedSourceSecretProviderId("zhihu")).toBe("cli:zhihu")
    expect(getConnectedSourceSecretProviderId("zhihu", true)).toBe("zhihu")
  })

  it("lists registered extension source IDs in stable order", async () => {
    loadSourceDescriptorsMock.mockResolvedValue([
      { id: "zhihu:hot-list" },
      { id: "github:trending" },
    ])

    await expect(listConnectedSources()).resolves.toEqual({
      data: ["github:trending", "zhihu:hot-list"],
    })
  })

  it("resolves and runs a registered extension source by its full ID", async () => {
    const loader = vi.fn().mockResolvedValue([
      { title: "Registered", url: "https://example.com/registered" },
    ])
    prepareSourceRequestMock.mockResolvedValue({
      params: { language: "typescript" },
      source: {
        loader,
        secrets: [],
      },
    })

    const result = await runConnectedSource({
      sourceId: "github:trending",
      params: { language: "typescript" },
    })

    expect(prepareSourceRequestMock).toHaveBeenCalledWith(
      "github:trending",
      { language: "typescript" },
    )
    expect(loader).toHaveBeenCalledWith(
      { language: "typescript" },
      expect.objectContaining({ secrets: {} }),
    )
    expect(result.data).toEqual([
      { title: "Registered", url: "https://example.com/registered" },
    ])
  })

  it("resolves and runs a temporary JSON provider without registering it", async () => {
    myFetchMock.mockResolvedValue({
      items: [
        { id: 1, label: "First" },
        { id: 2, label: "Second" },
      ],
    })

    const result = await runConnectedSource({
      providerId: "example",
      sourceId: "preview",
      provider: {
        title: "Run",
        defaults: {
          cache: "1m",
          metadata: {
            color: "blue",
          },
        },
        sources: {
          preview: {
            params: {
              topic: {
                type: "text",
                title: "Topic",
                default: "news",
              },
            },
            loader: {
              type: "json",
              url: "https://example.com/{{ params.topic | url_path }}",
              items: "items",
              fields: {
                title: "label",
                url: {
                  select: "id",
                  template: "https://example.com/items/{{ value }}",
                },
              },
            },
          },
        },
      },
      params: {
        topic: "technology",
      },
    })

    expect(myFetchMock).toHaveBeenCalledWith(
      "https://example.com/technology",
      undefined,
    )
    expect(result.data).toEqual([
      {
        title: "First",
        url: "https://example.com/items/1",
      },
      {
        title: "Second",
        url: "https://example.com/items/2",
      },
    ])
  })

  it("rejects an unknown source in the temporary provider", async () => {
    await expect(runConnectedSource({
      providerId: "example",
      sourceId: "missing",
      provider: {
        title: "Run",
        defaults: {
          cache: "1m",
          metadata: {
            color: "blue",
          },
        },
        sources: {
          preview: {
            loader: {
              type: "rss",
              url: "https://example.com/feed.xml",
            },
          },
        },
      },
    })).rejects.toThrow("Source \"example:missing\" not found")
  })
})
