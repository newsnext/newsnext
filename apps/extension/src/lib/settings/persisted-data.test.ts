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
    version: 8,
    settings,
    boards: [{
      color: "blue",
      id: "reading",
      name: "Reading",
      createdAt: 1,
      cardIds: ["rss:feed::one"],
      defaultLayer: "next",
      nowLayer: {
        sort: { mode: "manual", automaticMode: "addedAt", manualOrder: ["rss:feed::one"] },
      },
      nextLayer: { liveWidgets: [] },
    }],
    liveCards: [{
      cardId: "rss:feed::one",
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
      version: 8,
      boards: [{
        color: "blue",
        id: "reading",
        name: " Reading ",
        createdAt: 1,
        cardIds: ["second", "first", "first", "missing"],
        defaultLayer: "now",
        nowLayer: {
          sort: { mode: "manual", automaticMode: "provider", manualOrder: ["first"] },
        },
        nextLayer: {
          liveWidgets: [{
            widgetId: "latest",
            liveWidgetId: "latest-instance",
            dataScope: { type: "cards", cardIds: ["first", "missing", "first"] },
            layout: { x: 1, y: 2, width: 6, height: 4 },
          }],
        },
      }],
      liveCards: [
        { cardId: "first", workerId: "worker-a", sourceId: "rss:feed", patch: {}, createdAt: 1 },
        { cardId: "second", workerId: "worker-b", sourceId: "rss:feed", patch: {}, createdAt: 2 },
      ],
    })

    expect(data.boards[0]).toMatchObject({
      color: "blue",
      name: "Reading",
      cardIds: ["second", "first"],
      nowLayer: {
        sort: {
          mode: "manual",
          automaticMode: "provider",
          manualOrder: ["first", "second"],
        },
      },
      nextLayer: {
        liveWidgets: [{
          widgetId: "latest",
          liveWidgetId: "latest-instance",
          dataScope: { type: "cards", cardIds: ["first"] },
          layout: { x: 1, y: 2, width: 6, height: 4 },
        }],
      },
    })
    expect(data.liveCards.map(card => card.workerId)).toEqual(["worker-a", "worker-b"])
  })

  it("keeps the first Board as each LiveCard's owner", () => {
    const data = createData()
    data.boards.push({
      color: "purple",
      id: "duplicate",
      name: "Duplicate",
      createdAt: 2,
      cardIds: ["rss:feed::one"],
      defaultLayer: "now",
      nowLayer: {
        sort: { mode: "manual", automaticMode: "addedAt", manualOrder: ["rss:feed::one"] },
      },
      nextLayer: {
        liveWidgets: [{
          widgetId: "latest",
          liveWidgetId: "latest-instance",
          dataScope: { type: "cards", cardIds: ["rss:feed::one"] },
          layout: { x: 0, y: 0, width: 4, height: 4 },
        }],
      },
    })

    const normalized = normalizeApplicationData(data)

    expect(normalized.boards[0]?.cardIds).toEqual(["rss:feed::one"])
    expect(normalized.boards[1]?.cardIds).toEqual([])
    expect(normalized.boards[1]?.nowLayer.sort.manualOrder).toEqual([])
    expect(normalized.boards[1]?.nextLayer.liveWidgets[0]?.dataScope).toEqual({
      type: "cards",
      cardIds: [],
    })
  })

  it.each([3, 6, 7, 9])("rejects unsupported Application Data version %s without resetting it", (version) => {
    const original = { ...createData(), version }
    const before = structuredClone(original)
    expect(() => normalizeApplicationData(original)).toThrow("stored data must be preserved")
    expect(original).toEqual(before)
  })

  it("initializes only absent storage and rejects malformed stored collections", () => {
    expect(normalizeApplicationData(undefined)).toEqual({ version: 8, boards: [], liveCards: [] })
    expect(() => normalizeApplicationData(null)).toThrow()
    expect(() => normalizeApplicationData({ version: 8, boards: null, liveCards: [] })).toThrow("refusing")
    expect(() => normalizeApplicationData({ version: 8, boards: [], liveCards: null })).toThrow("refusing")
  })

  it("round-trips the current application shape and settings", () => {
    const data = createData()
    const serialized = serializePersistedDataExport(data)
    expect(JSON.parse(serialized).version).toBe(6)
    expect(parsePersistedDataExport(serialized)?.data).toEqual(data)
  })

  it("rejects removed and unsupported export formats", () => {
    const outdated = JSON.stringify({
      kind: "newsnext-user-data",
      version: 1,
      data: {
        boards: [],
        liveCards: [],
      },
    })
    expect(parsePersistedDataExport(outdated)).toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "other-app", version: 5, data: {} })))
      .toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "newsnext-user-data", version: 8, data: {} })))
      .toBeUndefined()
  })

  it("repairs ownership after a partial Board import", () => {
    const merged = mergePersistedUserData(createData(), {
      version: 8,
      boards: [],
    })
    expect(merged.boards).toHaveLength(1)
    expect(merged.boards[0]?.cardIds).toEqual(["rss:feed::one"])
    expect(merged.settings.general.defaultBoardId).toBe(merged.boards[0]?.id)
  })

  it("imports the complete Settings snapshot", () => {
    const current = createData()
    current.settings.general.nativeIntegrationEnabled = true
    const importedSettings = createDefaultPersistedSettings()
    importedSettings.appearance.themeMode = "dark"
    importedSettings.general.nativeIntegrationEnabled = false

    const merged = mergePersistedUserData(current, { settings: importedSettings })

    expect(merged.settings.appearance.themeMode).toBe("dark")
    expect(merged.settings.general.nativeIntegrationEnabled).toBe(false)
  })
})

describe("widget parameter persistence", () => {
  it("preserves parameter overrides through export and normalization", () => {
    const data = createData()
    data.boards[0]!.nextLayer.liveWidgets = [{
      widgetId: "feed",
      liveWidgetId: "feed-instance",
      dataScope: { type: "board" },
      layout: { x: 0, y: 0, width: 6, height: 4 },
      patch: { params: { limit: 5, enabled: false, categories: ["tech"] }, metadata: { title: "My feed", color: "teal", badge: "https://example.com/badge.png", home: "https://example.com", desc: "Description" }, view: { chart: "bar", limit: 10 } },
    }]
    const restored = parsePersistedDataExport(serializePersistedDataExport(data))
    expect(restored?.data.boards?.[0]?.nextLayer.liveWidgets).toEqual(data.boards[0]!.nextLayer.liveWidgets)
  })
})

describe("widget normalization", () => {
  it("expands half-card placements without crossing the grid boundary", () => {
    const data = createData()
    data.boards[0]!.nextLayer.liveWidgets = [{
      widgetId: "narrow",
      liveWidgetId: "narrow-instance",
      dataScope: { type: "board" },
      layout: { x: 11, y: 3, width: 1, height: 1 },
    }]
    const normalized = normalizeApplicationData(data)
    expect(normalized.boards[0]?.nextLayer.liveWidgets[0]?.layout).toEqual({
      x: 10,
      y: 3,
      width: 2,
      height: 1,
    })
    expect(normalizeApplicationData(normalized)).toEqual(normalized)
    expect(data.boards[0]?.nextLayer.liveWidgets[0]?.layout.width).toBe(1)
  })

  it("ignores old top-level settings and reads only an explicit patch", () => {
    const data = createData()
    const widget = { widgetId: "chart", liveWidgetId: "chart-instance", dataScope: { type: "board" }, layout: { x: 0, y: 0, width: 2, height: 2 }, params: { enabled: false }, metadata: { title: "Custom" } }
    const legacy = { ...data, boards: [{ ...data.boards[0], nextLayer: { liveWidgets: [widget] } }] }
    expect(normalizeApplicationData(legacy).boards[0]?.nextLayer.liveWidgets[0]?.patch).toBeUndefined()
    const current = { ...data, boards: [{ ...data.boards[0], nextLayer: { liveWidgets: [{ ...widget, patch: { view: { chart: "line" } } }] } }] }
    expect(normalizeApplicationData(current).boards[0]?.nextLayer.liveWidgets[0]?.patch).toEqual({ view: { chart: "line" } })
  })
})

describe("liveWidget instances", () => {
  it("rejects old exports even when they contain current data", () => {
    const data = createData()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "newsnext-user-data", version: 5, data }))).toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({ kind: "newsnext-user-data", version: 6, data: { ...data, version: 7 } }))).toBeUndefined()
  })
  it("preserves opaque instance IDs and independent placements while removing duplicate ownership", () => {
    const data = createData()
    const first = { widgetId: "shared", liveWidgetId: "legacy:reading:shared", dataScope: { type: "board" as const }, layout: { x: 0, y: 0, width: 2, height: 2 }, patch: { params: { count: 0 } } }
    data.boards[0]!.nextLayer.liveWidgets = [first, { ...first, liveWidgetId: "new-instance" }]
    data.boards.push({ ...data.boards[0]!, id: "other", name: "Other", cardIds: [], nextLayer: { liveWidgets: [first] } })
    const result = normalizeApplicationData(data)
    expect(result.boards[0]?.nextLayer.liveWidgets).toEqual(data.boards[0]?.nextLayer.liveWidgets)
    expect(result.boards[1]?.nextLayer.liveWidgets).toEqual([])
    expect(normalizeApplicationData(result)).toEqual(result)
  })
})
