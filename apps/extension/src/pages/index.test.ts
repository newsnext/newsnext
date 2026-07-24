import { describe, expect, it } from "vitest"
import { parseStoredBoard, resolveDefaultBoard } from "../lib/board-default"

describe("index default board routing", () => {
  it("uses stars when no default board is saved", () => {
    expect(resolveDefaultBoard(null, "forks")).toBe("stars")
  })

  it("uses the last active board when Last Used is explicitly saved", () => {
    expect(resolveDefaultBoard("last", "forks")).toBe("forks")
  })

  it("falls back to stars when Last Used is empty", () => {
    expect(resolveDefaultBoard("last", null)).toBe("stars")
  })

  it("uses an explicitly saved board over Last Used", () => {
    expect(resolveDefaultBoard("forks", "stars")).toBe("forks")
  })

  it("normalizes removed and invalid stored boards to stars", () => {
    expect(parseStoredBoard("featured")).toBe("stars")
    expect(parseStoredBoard("recommend")).toBe("stars")
    expect(resolveDefaultBoard(null, "unknown")).toBe("stars")
  })
})
