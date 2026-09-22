import type { Workspace } from "@/lib/native-protocol/Workspace"
import { describe, expect, it } from "vitest"
import { mergeWorkspaces, summarizeWorkspace } from "./workspace-resolution"

function workspace(boardId: string, cardId: string): Workspace {
  return {
    revision: 1,
    updatedAt: 1,
    boardOrder: [boardId],
    boards: { [boardId]: { id: boardId, color: "blue", createdAt: 1, layer: "now", name: boardId, nowLayer: { liveCards: [cardId] }, nextLayer: { liveWidgets: [] } } },
    liveCards: { [cardId]: { cardId, createdAt: 1, workerId: "worker", patch: {}, provider: { color: "blue", title: "RSS" }, sourceId: "rss:feed" } },
    liveWidgets: {},
    settings: "{}",
  }
}

describe("workspace resolution", () => {
  it("merges local-only keyed entities and preserves Layer order", () => {
    const merged = mergeWorkspaces(workspace("shared", "shared-card"), workspace("local", "local-card"))
    expect(merged.boardOrder).toEqual(["shared", "local"])
    expect(merged.boards.local?.nowLayer.liveCards).toEqual(["local-card"])
    expect(merged.liveCards["local-card"]).toBeDefined()
  })

  it("summarizes keyed entities", () => {
    expect(summarizeWorkspace(workspace("board", "card"))).toEqual({ boards: 1, liveCards: 1, liveWidgets: 0 })
  })
})
