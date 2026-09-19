import type { Workspace as NativeWorkspace } from "@/lib/native-protocol/Workspace"
import { describe, expect, it } from "vitest"
import {
  applyWorkspacePatch,
  createWorkspacePatch,
  parseWorkspacePatch,
} from "./workspace-patch"

function workspace(revision: number): NativeWorkspace {
  return {
    revision,
    updatedAt: 100,
    boards: [
      {
        color: "red",
        createdAt: 1,
        layer: "now",
        id: "board-a",
        nowLayer: { liveCards: ["card-a"] },
        name: "A",
        nextLayer: { liveWidgets: [] },
      },
      {
        color: "blue",
        createdAt: 2,
        layer: "now",
        id: "board-b",
        nowLayer: { liveCards: [] },
        name: "B",
        nextLayer: { liveWidgets: [] },
      },
    ],
    liveCards: [{
      createdAt: 1,
      cardId: "card-a",
      workerId: "worker-a",
      patch: {},
      sourceId: "source:a",
    }],
    settings: JSON.stringify({ version: 1 }),
  }
}

describe("workspace patches", () => {
  it("contains only changed entities and preserves explicit order", () => {
    const current = workspace(4)
    const candidate = workspace(4)
    candidate.boards = [{
      ...candidate.boards[1]!,
      color: "green",
      layer: "next",
      name: "Updated",
    }]
    candidate.liveCards = []

    const patch = createWorkspacePatch(current, candidate)

    expect(patch).toEqual({
      expectedRevision: 4,
      updatedAt: candidate.updatedAt,
      boardOrder: ["board-b"],
      boards: [candidate.boards[0]],
      cardOrder: [],
      liveCards: [],
      settings: candidate.settings,
    })
    const result = applyWorkspacePatch(current, patch)
    expect(result.revision).toBe(5)
    expect(result.updatedAt).toBe(candidate.updatedAt)
    expect(result.settings).toBe(candidate.settings)
    expect(result.boards).toHaveLength(1)
    expect(result.boards[0]?.id).toBe("board-b")
    expect(result.liveCards).toEqual([])
  })

  it("rejects patches for stale revisions", () => {
    const current = workspace(4)
    const patch = createWorkspacePatch(current, current)
    patch.expectedRevision = 3

    expect(() => applyWorkspacePatch(current, patch)).toThrow("expected revision 3")
  })

  it("includes synchronized Settings in every patch", () => {
    const current = workspace(4)
    const candidate = workspace(4)
    candidate.settings = JSON.stringify({
      general: { defaultBoardId: "board-a" },
      version: 1,
    })

    const patch = createWorkspacePatch(current, candidate)

    expect(patch.settings).toEqual(candidate.settings)
    expect(applyWorkspacePatch(current, patch).settings).toEqual(candidate.settings)
  })

  it("preserves Board references to unchanged LiveCards when parsing a patch", () => {
    const current = workspace(4)
    const candidate = workspace(4)
    candidate.liveCards.push({
      createdAt: 2,
      cardId: "card-b",
      workerId: "worker-b",
      patch: {},
      sourceId: "source:b",
    })
    candidate.boards[0] = {
      ...candidate.boards[0]!,
      nowLayer: { liveCards: ["card-b", "card-a"] },
    }

    const patch = parseWorkspacePatch(createWorkspacePatch(current, candidate))

    expect(patch.liveCards.map(card => card.cardId)).toEqual(["card-b"])
    expect(patch.boards[0]?.nowLayer.liveCards).toEqual(["card-b", "card-a"])
    expect(applyWorkspacePatch(current, patch).boards[0]?.nowLayer.liveCards).toEqual([
      "card-b",
      "card-a",
    ])
  })
})
