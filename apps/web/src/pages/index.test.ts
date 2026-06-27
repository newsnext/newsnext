import { describe, expect, it } from "vitest"
import { parseStoredBoard, resolveDefaultBoard } from "../lib/board-default"

describe("index default board routing", () => {
  it("uses the last active board when no default board is saved", () => {
    expect(resolveDefaultBoard(null, "stars")).toBe("stars")
  })

  it("falls back to featured when Last Used is empty", () => {
    expect(resolveDefaultBoard("last", null)).toBe("featured")
  })

  it("uses an explicitly saved board over Last Used", () => {
    expect(resolveDefaultBoard("forks", "stars")).toBe("forks")
  })

  it("normalizes invalid stored boards to featured", () => {
    expect(parseStoredBoard("recommend")).toBe("featured")
    expect(resolveDefaultBoard(null, "unknown")).toBe("featured")
  })
})
