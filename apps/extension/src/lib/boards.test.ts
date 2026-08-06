import { describe, expect, it } from "vitest"
import { getAdjacentBoardId } from "./boards"

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
