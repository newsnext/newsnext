import { describe, expect, it } from "vitest"
import {
  mergePersistedUserData,
  normalizeBoards,
  parsePersistedDataExport,
  serializePersistedDataExport,
} from "./persisted-data"
import { createDefaultPersistedSettings } from "./persisted-settings"

describe("persisted user data", () => {
  it("round-trips portable settings, boards, instances, and sort preferences", () => {
    const data = {
      settings: createDefaultPersistedSettings(),
      boards: [
        {
          id: "all",
          name: "All",
          sort: { mode: "createdAt" as const, automaticMode: "createdAt" as const, manualOrder: [] },
        },
        {
          id: "reading",
          name: "Reading",
          color: "blue" as const,
          filter: {
            mode: "exclude" as const,
            keywords: ["spoiler", "rumor"],
          },
          sort: {
            mode: "manual" as const,
            automaticMode: "createdAt" as const,
            manualOrder: ["rss:feed::card_1"],
          },
        },
      ],
      instances: [{
        instanceId: "rss:feed::card_1",
        sourceId: "rss:feed",
        boardId: "reading",
        patch: { params: { url: "https://example.com/feed.xml" } },
        createdAt: 1,
      }],
    }

    expect(parsePersistedDataExport(serializePersistedDataExport(data)))
      ?.toEqual(expect.objectContaining({ data }))
  })

  it("rejects another export kind or version", () => {
    expect(parsePersistedDataExport(JSON.stringify({
      kind: "other-app",
      version: 1,
      data: {},
    }))).toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({
      kind: "newsnext-user-data",
      version: 2,
      data: {},
    }))).toBeUndefined()
    expect(parsePersistedDataExport(JSON.stringify({
      kind: "newsnext-user-data",
      version: 1,
      data: {},
    }))).toBeUndefined()
  })

  it("exports only selected data slices", () => {
    const data = {
      settings: createDefaultPersistedSettings(),
      boards: [{
        id: "all",
        name: "All",
        sort: { mode: "createdAt" as const, automaticMode: "createdAt" as const, manualOrder: [] },
      }],
      instances: [],
    }

    expect(parsePersistedDataExport(
      serializePersistedDataExport(data, ["boards"]),
    )?.data).toEqual({ boards: data.boards })
  })

  it("merges selected data and repairs cross-slice references", () => {
    const settings = createDefaultPersistedSettings()
    settings.general.defaultBoardId = "reading"
    const current = {
      settings,
      boards: [
        {
          id: "all",
          name: "All",
          sort: { mode: "createdAt" as const, automaticMode: "createdAt" as const, manualOrder: [] },
        },
        {
          id: "reading",
          name: "Reading",
          sort: { mode: "createdAt" as const, automaticMode: "createdAt" as const, manualOrder: [] },
        },
      ],
      instances: [{
        instanceId: "rss:feed::card_1",
        sourceId: "rss:feed",
        boardId: "reading",
        patch: {},
        createdAt: 1,
      }],
    }

    const merged = mergePersistedUserData(current, {
      boards: [{
        id: "all",
        name: "All",
        sort: { mode: "createdAt", automaticMode: "createdAt", manualOrder: [] },
      }],
    })

    expect(merged.settings.general.defaultBoardId).toBe("all")
    expect(merged.instances[0]?.boardId).toBeNull()
  })

  it("deduplicates boards and restores the required All board", () => {
    expect(normalizeBoards([
      { id: "reading", name: "Reading" },
      { id: "reading", name: "Duplicate" },
      { id: 42, name: "Invalid" },
    ])).toEqual([
      {
        id: "all",
        name: "All",
        sort: { mode: "createdAt", automaticMode: "createdAt", manualOrder: [] },
      },
      {
        id: "reading",
        name: "Reading",
        sort: { mode: "createdAt", automaticMode: "createdAt", manualOrder: [] },
      },
    ])
  })
})
