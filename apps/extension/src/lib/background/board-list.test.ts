import type { Board } from "../board"
import type { SourceInstance } from "../source"
import { describe, expect, it } from "vitest"
import { createBoardSortPreference } from "../board"
import { groupInstancesByBoard } from "./board-list-data"

const boards: Board[] = [
  { id: "ai", name: "AI", sort: createBoardSortPreference() },
  { id: "design", name: "Design", sort: createBoardSortPreference() },
]

function createInstance(instanceId: string, boardId: string | null): SourceInstance {
  return {
    boardId,
    createdAt: 1,
    instanceId,
    patch: {},
    sourceId: `source:${instanceId}`,
  }
}

describe("groupInstancesByBoard", () => {
  it("groups every instance by saved board and keeps unassigned instances separate", () => {
    const ai = createInstance("ai-1", "ai")
    const unassigned = createInstance("unassigned-1", null)
    const orphaned = createInstance("orphaned-1", "missing")

    expect(groupInstancesByBoard(boards, [ai, unassigned, orphaned])).toEqual({
      boards: [
        { ...boards[0], instances: [ai] },
        { ...boards[1], instances: [] },
      ],
      totalInstanceCount: 3,
      unassignedInstances: [unassigned, orphaned],
    })
  })
})
