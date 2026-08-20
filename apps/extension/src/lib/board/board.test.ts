import { describe, expect, it } from "vitest"
import { getAdjacentBoardId, getBoardLayerFromState } from "./board"

const boards = ["all", "reading", "saved"].map(id => ({ id }))

describe("board navigation", () => {
  it("moves between boards and wraps at both ends", () => {
    expect(getAdjacentBoardId(boards, "reading", -1)).toBe("all")
    expect(getAdjacentBoardId(boards, "reading", 1)).toBe("saved")
    expect(getAdjacentBoardId(boards, "all", -1)).toBe("saved")
    expect(getAdjacentBoardId(boards, "saved", 1)).toBe("all")
  })

  it("does not navigate without a valid alternative", () => {
    expect(getAdjacentBoardId(boards, "missing", 1)).toBeUndefined()
    expect(getAdjacentBoardId(boards.slice(0, 1), "all", 1)).toBeUndefined()
  })
})

describe("board layer history state", () => {
  it("accepts supported layers", () => {
    expect(getBoardLayerFromState({ layer: "now" })).toBe("now")
    expect(getBoardLayerFromState({ layer: "next" })).toBe("next")
  })

  it("ignores invalid state", () => {
    expect(getBoardLayerFromState({ layer: "future" })).toBeUndefined()
    expect(getBoardLayerFromState({})).toBeUndefined()
    expect(getBoardLayerFromState(null)).toBeUndefined()
  })
})
