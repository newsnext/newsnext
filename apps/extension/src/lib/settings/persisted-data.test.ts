import type { PersistedUserData } from "./persisted-data"
import { describe, expect, it } from "vitest"
import {
  mergePersistedUserData,
  normalizeApplicationData,
  parsePersistedDataExport,
  serializePersistedDataExport,
} from "./persisted-data"
import { createDefaultPersistedSettings } from "./persisted-settings"

function createData(): PersistedUserData {
  const settings = createDefaultPersistedSettings()
  settings.general.defaultBoardId = "reading"
  return {
    version: 2,
    settings,
    collections: [{
      id: "reading",
      name: "Reading",
      createdAt: 1,
      instanceIds: ["rss:feed::one"],
      defaultLayer: "next",
      nowLayer: {
        color: "blue",
        sort: { mode: "manual", automaticMode: "addedAt", manualOrder: ["rss:feed::one"] },
      },
    }],
    instances: [{
      instanceId: "rss:feed::one",
      sourceId: "rss:feed",
      patch: { params: { url: "https://example.com/feed.xml" } },
      createdAt: 1,
    }],
  }
}

describe("persisted user data", () => {
  it("normalizes v2 Collection membership and NowLayer order", () => {
    const data = normalizeApplicationData({
      version: 2,
      collections: [{
        id: "reading",
        name: " Reading ",
        createdAt: 1,
        instanceIds: ["second", "first", "first", "missing"],
        defaultLayer: "now",
        nowLayer: {
          color: "blue",
          sort: { mode: "manual", automaticMode: "provider", manualOrder: ["first"] },
        },
      }],
      instances: [
        { instanceId: "first", sourceId: "rss:feed", patch: {}, createdAt: 1 },
        { instanceId: "second", sourceId: "rss:feed", patch: {}, createdAt: 2 },
      ],
    })

    expect(data.collections[0]).toMatchObject({
      name: "Reading",
      instanceIds: ["second", "first"],
      nowLayer: {
        sort: {
          mode: "manual",
          automaticMode: "provider",
          manualOrder: ["first", "second"],
        },
      },
    })
  })

  it("migrates legacy memberships by Instance createdAt descending", () => {
    const data = normalizeApplicationData({
      collections: [{ id: "reading", name: "Reading", createdAt: 1 }],
      collectionViews: [{
        collectionId: "reading",
        color: "purple",
        defaultLayer: "next",
        sortMode: "manual",
        automaticSortMode: "createdAt",
      }],
      collectionEntries: [
        { collectionId: "reading", instanceId: "older", addedAt: 99, position: 0 },
        { collectionId: "reading", instanceId: "newer", addedAt: 1, position: 1 },
      ],
      instances: [
        { instanceId: "older", sourceId: "rss:feed", patch: {}, createdAt: 1 },
        { instanceId: "newer", sourceId: "rss:feed", patch: {}, createdAt: 2 },
      ],
    })

    expect(data.version).toBe(2)
    expect(data.collections[0]).toEqual({
      id: "reading",
      name: "Reading",
      createdAt: 1,
      instanceIds: ["newer", "older"],
      defaultLayer: "next",
      nowLayer: {
        color: "purple",
        sort: {
          mode: "manual",
          automaticMode: "addedAt",
          manualOrder: ["older", "newer"],
        },
      },
    })
  })

  it("round-trips the v2 application shape and settings", () => {
    const data = createData()
    const serialized = serializePersistedDataExport(data)
    expect(JSON.parse(serialized).version).toBe(2)
    expect(parsePersistedDataExport(serialized)?.data).toEqual(data)
  })

  it("accepts v1 exports and rejects unsupported formats", () => {
    const legacy = JSON.stringify({
      kind: "newsnext-user-data",
      version: 1,
      data: {
        collections: [{ id: "legacy", name: "Legacy", createdAt: 1 }],
        collectionEntries: [],
        collectionViews: [],
        instances: [],
      },
    })
    expect(parsePersistedDataExport(legacy)?.version).toBe(2)
    expect(parsePersistedDataExport(JSON.stringify({ kind: "other-app", version: 2, data: {} })))
      .toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "newsnext-user-data", version: 3, data: {} })))
      .toBeUndefined()
  })

  it("repairs ownership after a partial Board import", () => {
    const merged = mergePersistedUserData(createData(), {
      version: 2,
      collections: [],
    })
    expect(merged.collections).toHaveLength(1)
    expect(merged.collections[0]?.instanceIds).toEqual(["rss:feed::one"])
    expect(merged.settings.general.defaultBoardId).toBe(merged.collections[0]?.id)
  })
})
