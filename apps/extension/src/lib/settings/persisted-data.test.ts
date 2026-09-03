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
    version: 5,
    settings,
    boards: [{
      color: "blue",
      id: "reading",
      illustration: null,
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
      workerId: "worker-a",
      sourceId: "rss:feed",
      patch: { params: { url: "https://example.com/feed.xml" } },
      createdAt: 1,
    }],
  }
}

describe("persisted user data", () => {
  it("normalizes current Board membership, color, and layer state", () => {
    const data = normalizeApplicationData({
      version: 5,
      boards: [{
        color: "blue",
        id: "reading",
        illustration: {
          id: "b".repeat(64),
          opacity: 12,
          transform: {
            positionMode: "viewport-center",
            rotation: 15,
            scale: 1.25,
            x: 40,
            y: 60,
          },
        },
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
        { instanceId: "first", workerId: "worker-a", sourceId: "rss:feed", patch: {}, createdAt: 1 },
        { instanceId: "second", workerId: "worker-b", sourceId: "rss:feed", patch: {}, createdAt: 2 },
      ],
    })

    expect(data.boards[0]).toMatchObject({
      color: "blue",
      name: "Reading",
      illustration: {
        id: "b".repeat(64),
        opacity: 12,
      },
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
    expect(data.instances.map(instance => instance.workerId)).toEqual(["worker-a", "worker-b"])
  })

  it("keeps only the first Board membership for each Instance", () => {
    const data = createData()
    data.boards.push({
      color: "purple",
      id: "duplicate",
      illustration: null,
      name: "Duplicate",
      createdAt: 2,
      instanceIds: ["rss:feed::one"],
      defaultLayer: "now",
      nowLayer: {
        sort: { mode: "manual", automaticMode: "addedAt", manualOrder: ["rss:feed::one"] },
      },
      nextLayer: {
        widgets: [{
          widgetId: "latest",
          dataScope: { type: "instances", instanceIds: ["rss:feed::one"] },
          layout: { x: 0, y: 0, width: 4, height: 4 },
        }],
      },
    })

    const normalized = normalizeApplicationData(data)

    expect(normalized.boards[0]?.instanceIds).toEqual(["rss:feed::one"])
    expect(normalized.boards[1]?.instanceIds).toEqual([])
    expect(normalized.boards[1]?.nowLayer.sort.manualOrder).toEqual([])
    expect(normalized.boards[1]?.nextLayer.widgets[0]?.dataScope).toEqual({
      type: "instances",
      instanceIds: [],
    })
  })

  it("rejects noncurrent Application Data", () => {
    const data = normalizeApplicationData({
      version: 3,
      boards: [],
      instances: [],
    })

    expect(data).toEqual({ version: 5, boards: [], instances: [] })
  })

  it("round-trips the current application shape and settings", () => {
    const data = createData()
    const serialized = serializePersistedDataExport(data)
    expect(JSON.parse(serialized).version).toBe(5)
    expect(parsePersistedDataExport(serialized)?.data).toEqual(data)
  })

  it("rejects removed and unsupported export formats", () => {
    const outdated = JSON.stringify({
      kind: "newsnext-user-data",
      version: 1,
      data: {
        boards: [],
        instances: [],
      },
    })
    expect(parsePersistedDataExport(outdated)).toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "other-app", version: 5, data: {} })))
      .toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "newsnext-user-data", version: 6, data: {} })))
      .toBeUndefined()
  })

  it("repairs ownership after a partial Board import", () => {
    const merged = mergePersistedUserData(createData(), {
      version: 5,
      boards: [],
    })
    expect(merged.boards).toHaveLength(1)
    expect(merged.boards[0]?.instanceIds).toEqual(["rss:feed::one"])
    expect(merged.settings.general.defaultBoardId).toBe(merged.boards[0]?.id)
  })

  it("imports the complete Settings snapshot", () => {
    const current = createData()
    current.settings.general.appIntegrationEnabled = true
    const importedSettings = createDefaultPersistedSettings()
    importedSettings.appearance.themeMode = "dark"
    importedSettings.general.appIntegrationEnabled = false

    const merged = mergePersistedUserData(current, { settings: importedSettings })

    expect(merged.settings.appearance.themeMode).toBe("dark")
    expect(merged.settings.general.appIntegrationEnabled).toBe(false)
  })
})
