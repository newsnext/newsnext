import { flattenProviderConfig } from "@newsnext/source/utils/source"
import { beforeEach, describe, expect, it, vi } from "vitest"

const storageLocal = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))
const permissions = vi.hoisted(() => ({
  request: vi.fn(),
}))
let storageState: Record<string, unknown> = {}

vi.mock("#imports", () => ({
  browser: {
    permissions,
    storage: {
      local: storageLocal,
    },
  },
}))

const {
  fetchSourceRegistry,
  loadConfiguredSourceRegistry,
  normalizeRegistryUrls,
  readRegistryUrls,
  requestRegistryUrlPermissions,
  updateConfiguredSourceRegistries,
  writeRegistryUrls,
} = await import("./registry-settings")

function createRegistry(title: string) {
  return flattenProviderConfig("remote", {
    title,
    color: "blue",
    sources: {
      latest: {
        cache: "5m",
        loader: {
          type: "rss",
          url: "https://example.com/feed.xml",
        },
      },
    },
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  storageState = {}
  storageLocal.get.mockReset()
  storageLocal.set.mockReset()
  permissions.request.mockReset()
  storageLocal.get.mockImplementation(async (key: string) => ({
    [key]: storageState[key],
  }))
  storageLocal.set.mockImplementation(async (value: Record<string, unknown>) => {
    Object.assign(storageState, value)
  })
})

describe("registry settings", () => {
  it("normalizes unique HTTPS registry URLs", () => {
    expect(normalizeRegistryUrls([
      " https://example.com/registry.json#latest ",
      "https://example.com/registry.json",
      "http://example.com/registry.json",
      "invalid",
    ])).toEqual(["https://example.com/registry.json"])
  })

  it("reads and writes registry URLs in extension storage", async () => {
    storageState["newsnext-registry-urls"] = [
      "https://example.com/registry.json",
    ]

    await expect(readRegistryUrls()).resolves.toEqual([
      "https://example.com/registry.json",
    ])
    await expect(writeRegistryUrls([
      "https://one.example/registry.json",
      "http://ignored.example/registry.json",
    ])).resolves.toEqual([
      "https://one.example/registry.json",
    ])
    expect(storageLocal.set).toHaveBeenCalledWith({
      "newsnext-registry-urls": ["https://one.example/registry.json"],
    })
  })

  it("requests access to configured registry origins", async () => {
    permissions.request.mockResolvedValue(true)

    await expect(requestRegistryUrlPermissions([
      "https://raw.githubusercontent.com/owner/repo/main/registry.json",
      "https://example.com/registry.json",
    ])).resolves.toBe(true)

    expect(permissions.request).toHaveBeenCalledWith({
      origins: [
        "https://raw.githubusercontent.com/*",
        "https://example.com/*",
      ],
    })
  })

  it("fetches and validates a registry before returning it", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(createRegistry("Remote")),
      {
        headers: { "content-type": "application/json" },
        status: 200,
      },
    ))

    await expect(fetchSourceRegistry(
      "https://example.com/registry.json",
      fetcher,
    )).resolves.toHaveProperty("remote:latest")
  })

  it("updates storage and merges cached registries in order", async () => {
    storageState["newsnext-registry-urls"] = [
      "https://one.example/registry.json",
      "https://two.example/registry.json",
    ]
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      const title = url.includes("two.example") ? "Second" : "First"
      return new Response(JSON.stringify(createRegistry(title)), { status: 200 })
    })

    await updateConfiguredSourceRegistries(fetcher)
    const registry = await loadConfiguredSourceRegistry()

    expect(registry["remote:latest"].metadata?.providerTitle).toBe("Second")
    expect(storageState["newsnext-registry-cache"]).toMatchObject({
      entries: {
        "https://one.example/registry.json": {
          registry: expect.objectContaining({ "remote:latest": expect.any(Object) }),
        },
        "https://two.example/registry.json": {
          registry: expect.objectContaining({ "remote:latest": expect.any(Object) }),
        },
      },
    })
  })

  it("loads cached registries without making a network request", async () => {
    const url = "https://example.com/registry.json"
    storageState["newsnext-registry-urls"] = [url]
    storageState["newsnext-registry-cache"] = {
      entries: {
        [url]: {
          registry: createRegistry("Cached"),
          updatedAt: Date.now(),
        },
      },
    }
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)

    const registry = await loadConfiguredSourceRegistry()

    expect(registry["remote:latest"].metadata?.providerTitle).toBe("Cached")
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("retains the last valid cached registry when an update fails", async () => {
    const url = "https://example.com/registry.json"
    const cachedRegistry = createRegistry("Last known good")
    storageState["newsnext-registry-urls"] = [url]
    storageState["newsnext-registry-cache"] = {
      entries: {
        [url]: {
          registry: cachedRegistry,
          updatedAt: 100,
        },
      },
    }
    const fetcher = vi.fn().mockRejectedValue(new Error("Network unavailable"))

    await expect(updateConfiguredSourceRegistries(fetcher)).resolves.toEqual([{
      error: "Network unavailable",
      retained: true,
      url,
    }])
    expect(storageState["newsnext-registry-cache"]).toEqual({
      entries: {
        [url]: {
          registry: cachedRegistry,
          updatedAt: 100,
        },
      },
    })
  })
})
