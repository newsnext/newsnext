import type { NewsNextDataInstance, PreparedInstanceSourceRequest } from "@newsnext/instance"
import type { SourceDescriptor } from "@newsnext/server-source/typings"
import { MemoryCacheAdapter } from "@newsnext/cache/memory"
import { describe, expect, it } from "vitest"
import { CachedNewsNextInstance } from "./instance-client"

describe("cachedNewsNextInstance", () => {
  it("caches source fetches inside the API instance", async () => {
    const adapter = new MemoryCacheAdapter()
    const sourceInstance = createTestSourceInstance()
    const instance = new CachedNewsNextInstance(adapter, sourceInstance)

    const first = await instance.loadSource<string[]>({ sourceId: "test:feed" })
    const second = await instance.loadSource<string[]>({ sourceId: "test:feed" })
    const latest = await instance.loadSource<string[]>({ sourceId: "test:feed", latest: true })

    expect(first.items).toEqual(["item-1"])
    expect(second.items).toEqual(["item-1"])
    expect(second.status).toBe("success")
    expect(latest.items).toEqual(["item-2"])
  })
})

function createTestSourceInstance(): NewsNextDataInstance {
  let loadCount = 0
  const source: PreparedInstanceSourceRequest<string[]>["source"] = {
    key: "feed",
    providerTitle: "Test",
    title: "Test",
    color: "blue",
    category: "tech",
    type: "hottest",
    loader: async () => [],
  }

  return {
    listSourceDescriptors: (): SourceDescriptor[] => [],
    prepareInstanceSourceRequest: <T = unknown>(): PreparedInstanceSourceRequest<T> => ({
      sourceId: "test:feed",
      key: "test:feed:{}",
      params: {},
      source,
      fetcher: async () => {
        loadCount += 1
        return [`item-${loadCount}`] as T
      },
    }),
    async loadSource<T = unknown>(): Promise<{
      id: string
      key: string
      items: T
      updated: number
    }> {
      const request = this.prepareInstanceSourceRequest<T>({ sourceId: "test:feed" })
      return {
        id: request.sourceId,
        key: request.key,
        items: await request.fetcher(),
        updated: Date.now(),
      }
    },
  }
}
