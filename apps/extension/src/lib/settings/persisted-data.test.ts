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
    version: 4,
    settings,
    boards: [{
      color: "blue",
      id: "reading",
      name: "Reading",
      createdAt: 1,
      instanceIds: ["rss:feed::one"],
      defaultLayer: "next",
      nowLayer: {
        sort: { mode: "manual", automaticMode: "addedAt", manualOrder: ["rss:feed::one"] },
      },
      nextLayer: { widgets: [] },
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
  it("normalizes v4 Board membership, color, and layer state", () => {
    const data = normalizeApplicationData({
      version: 4,
      boards: [{
        color: "blue",
        id: "reading",
        name: " Reading ",
        createdAt: 1,
        instanceIds: ["second", "first", "first", "missing"],
        defaultLayer: "now",
        nowLayer: {
          sort: { mode: "manual", automaticMode: "provider", manualOrder: ["first"] },
        },
        nextLayer: {
          widgets: [{
            widgetId: "latest",
            dataScope: { type: "instances", instanceIds: ["first", "missing", "first"] },
            layout: { x: 1, y: 2, width: 6, height: 4 },
          }],
        },
      }],
      instances: [
        { instanceId: "first", sourceId: "rss:feed", patch: {}, createdAt: 1 },
        { instanceId: "second", sourceId: "rss:feed", patch: {}, createdAt: 2 },
      ],
    })

    expect(data.boards[0]).toMatchObject({
      color: "blue",
      name: "Reading",
      instanceIds: ["second", "first"],
      nowLayer: {
        sort: {
          mode: "manual",
          automaticMode: "provider",
          manualOrder: ["first", "second"],
        },
      },
      nextLayer: {
        widgets: [{
          widgetId: "latest",
          dataScope: { type: "instances", instanceIds: ["first"] },
          layout: { x: 1, y: 2, width: 6, height: 4 },
        }],
      },
    })
  })

  it("does not retain removed Board storage shapes", () => {
    const data = normalizeApplicationData({
      version: 2,
      groups: [{ id: "reading", name: "Reading", createdAt: 1 }],
      instances: [],
    })

    expect(data).toEqual({ version: 4, boards: [], instances: [] })
  })

  it("round-trips the v4 application shape and settings", () => {
    const data = createData()
    const serialized = serializePersistedDataExport(data)
    expect(JSON.parse(serialized).version).toBe(4)
    expect(parsePersistedDataExport(serialized)?.data).toEqual(data)
  })

  it("rejects removed and unsupported export formats", () => {
    const legacy = JSON.stringify({
      kind: "newsnext-user-data",
      version: 1,
      data: {
        boards: [{ id: "legacy", name: "Legacy", createdAt: 1 }],
        boardEntries: [],
        boardViews: [],
        instances: [],
      },
    })
    expect(parsePersistedDataExport(legacy)).toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "other-app", version: 4, data: {} })))
      .toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "newsnext-user-data", version: 5, data: {} })))
      .toBeUndefined()
  })

  it("repairs ownership after a partial Board import", () => {
    const merged = mergePersistedUserData(createData(), {
      version: 4,
      boards: [],
    })
    expect(merged.boards).toHaveLength(1)
    expect(merged.boards[0]?.instanceIds).toEqual(["rss:feed::one"])
    expect(merged.settings.general.defaultBoardId).toBe(merged.boards[0]?.id)
  })
})
