import type { TitleIslandFeature } from "./feature"
import { describe, expect, it } from "vitest"
import { resolveTitleIslandFeature } from "./feature"

function createFeature(id: string, priority: number): TitleIslandFeature {
  return {
    content: id,
    height: 80,
    id,
    priority,
    width: 200,
  }
}

describe("resolveTitleIslandFeature", () => {
  it("selects the highest-priority available feature", () => {
    expect(resolveTitleIslandFeature([
      createFeature("panel", 100),
      null,
      createFeature("interaction", 300),
      createFeature("notification", 200),
    ])?.id).toBe("interaction")
  })

  it("keeps declaration order when priorities match", () => {
    expect(resolveTitleIslandFeature([
      createFeature("first", 100),
      createFeature("second", 100),
    ])?.id).toBe("first")
  })
})
