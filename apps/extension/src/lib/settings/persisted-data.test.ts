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
  return {
    settings: createDefaultPersistedSettings(),
    collections: [{ id: "reading", name: "Reading", createdAt: 1 }],
    collectionViews: [{
      collectionId: "reading",
      color: "blue",
      defaultLayer: "next",
      sortMode: "manual",
      automaticSortMode: "createdAt",
    }],
    collectionEntries: [{
      collectionId: "reading",
      instanceId: "rss:feed::R5xK2mN8qP4s",
      addedAt: 1,
      position: 0,
    }],
    instances: [{
      instanceId: "rss:feed::R5xK2mN8qP4s",
      sourceId: "rss:feed",
      patch: { params: { url: "https://example.com/feed.xml" } },
      createdAt: 1,
    }],
  }
}

describe("persisted user data", () => {
  it("enforces canonical IDs, names, and contiguous membership positions", () => {
    const data = normalizeApplicationData({
      collections: [
        { id: "reading", name: "Reading", createdAt: 1 },
        { id: "duplicate", name: "reading", createdAt: 2 },
        { id: "", name: "Invalid", createdAt: 3 },
      ],
      collectionViews: [{
        collectionId: "reading",
        defaultLayer: "now",
        filter: { mode: "exclude", keywords: ["spoiler"] },
        sortMode: "createdAt",
        automaticSortMode: "createdAt",
      }],
      instances: [
        { instanceId: "second", sourceId: "rss:feed", patch: {}, createdAt: 2 },
        { instanceId: "first", sourceId: "rss:feed", patch: {}, createdAt: 1 },
        { instanceId: "", sourceId: "rss:feed", patch: {}, createdAt: 3 },
      ],
      collectionEntries: [
        { collectionId: "reading", instanceId: "second", addedAt: 2, position: 9 },
        { collectionId: "reading", instanceId: "first", addedAt: 1, position: 4 },
        { collectionId: "reading", instanceId: "first", addedAt: 1, position: -1 },
      ],
    })

    expect(data.collections.map(collection => collection.id)).toEqual(["reading"])
    expect(data.instances.map(instance => instance.instanceId)).toEqual(["second", "first"])
    expect(data.collectionViews).toEqual([{
      automaticSortMode: "createdAt",
      collectionId: "reading",
      defaultLayer: "now",
      sortMode: "createdAt",
    }])
    expect(data.collectionEntries).toEqual([
      { collectionId: "reading", instanceId: "first", addedAt: 1, position: 0 },
      { collectionId: "reading", instanceId: "second", addedAt: 2, position: 1 },
    ])
  })

  it("round-trips Collections, memberships, Instances, Views, and settings", () => {
    const data = createData()
    expect(parsePersistedDataExport(serializePersistedDataExport(data))?.data).toEqual(data)
  })

  it("imports legacy v1 Board and Instance exports into Collections", () => {
    const settings = createDefaultPersistedSettings()
    const imported = parsePersistedDataExport(JSON.stringify({
      kind: "newsnext-user-data",
      version: 1,
      data: {
        settings,
        boards: [{
          id: "reading",
          name: "Reading",
          color: "blue",
          sort: {
            mode: "manual",
            automaticMode: "provider",
            manualOrder: ["rss:feed::legacy"],
          },
        }],
        instances: [{
          instanceId: "rss:feed::legacy",
          sourceId: "rss:feed",
          boardId: "reading",
          patch: {},
          createdAt: 10,
        }],
      },
    }))

    expect(imported?.version).toBe(2)
    expect(imported?.data).toMatchObject({
      collections: [{ id: "reading", name: "Reading", createdAt: 0 }],
      collectionViews: [{
        collectionId: "reading",
        color: "blue",
        sortMode: "manual",
        automaticSortMode: "provider",
      }],
      collectionEntries: [{
        collectionId: "reading",
        instanceId: "rss:feed::legacy",
        addedAt: 10,
        position: 0,
      }],
      instances: [{
        instanceId: "rss:feed::legacy",
        sourceId: "rss:feed",
        patch: {},
        createdAt: 10,
      }],
    })
  })

  it("rejects another export kind or unsupported version", () => {
    expect(parsePersistedDataExport(JSON.stringify({ kind: "other-app", version: 2, data: {} })))
      .toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "newsnext-user-data", version: 3, data: {} })))
      .toBeUndefined()
  })

  it("exports Board and Instance slices independently", () => {
    const data = createData()
    expect(parsePersistedDataExport(serializePersistedDataExport(data, ["boards"]))?.data)
      .toEqual({
        collections: data.collections,
        collectionEntries: data.collectionEntries,
        collectionViews: data.collectionViews,
      })
  })

  it("repairs memberships after a partial import", () => {
    const current = createData()
    current.settings.general.defaultBoardId = "reading"
    const merged = mergePersistedUserData(current, {
      collections: [],
      collectionEntries: [],
      collectionViews: [],
    })
    expect(merged.settings.general.defaultBoardId).toBe("all")
    expect(merged.collectionEntries).toEqual([])
    expect(merged.instances).toEqual(current.instances)
  })
})
