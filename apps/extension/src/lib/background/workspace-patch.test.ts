import type { Workspace } from "@/lib/native-protocol/Workspace"
import { describe, expect, it } from "vitest"
import { applyWorkspacePatch, createWorkspacePatch } from "./workspace-patch"

function workspace(): Workspace {
  return {
    revision: 1,
    updatedAt: 1,
    boardOrder: ["board"],
    boards: { board: { id: "board", color: "blue", createdAt: 1, layer: "now", name: "Board", nowLayer: { liveCards: ["card"] }, nextLayer: { liveWidgets: [] } } },
    liveCards: { card: { cardId: "card", createdAt: 1, workerId: "worker", patch: {}, provider: { color: "blue", title: "RSS" }, sourceId: "rss:feed" } },
    liveWidgets: {},
    settings: "{}",
  }
}

describe("workspace patches", () => {
  it("sends and applies only changed keyed entities", () => {
    const current = workspace()
    const candidate = structuredClone(current)
    candidate.updatedAt = 2
    candidate.liveCards.card!.patch = { params: { limit: 5 } }
    const patch = createWorkspacePatch(current, candidate)
    expect(Object.keys(patch.liveCards)).toEqual(["card"])
    expect(patch.boards).toEqual({})
    expect(applyWorkspacePatch(current, patch).liveCards.card?.patch).toEqual({ params: { limit: 5 } })
  })

  it("uses Layer arrays as membership and order", () => {
    const current = workspace()
    const candidate = structuredClone(current)
    candidate.updatedAt = 2
    candidate.boards.board!.nowLayer.liveCards = []
    delete candidate.liveCards.card
    const applied = applyWorkspacePatch(current, createWorkspacePatch(current, candidate))
    expect(applied.boards.board?.nowLayer.liveCards).toEqual([])
    expect(applied.liveCards).toEqual({})
  })
})
