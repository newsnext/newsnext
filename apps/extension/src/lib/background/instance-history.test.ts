import type { SourceInstance } from "../source"
import { describe, expect, it } from "vitest"
import { resolveInstanceHistoryTarget } from "./instance-history-data"

function createInstance(
  instanceId: string,
  params?: Record<string, unknown>,
): SourceInstance {
  return {
    instanceId,
    sourceId: "github:trending",
    boardId: "technology",
    patch: { params },
    createdAt: 1,
  }
}

describe("instance history", () => {
  it("resolves the source and parameters from the saved instance", () => {
    expect(resolveInstanceHistoryTarget([
      createInstance("github:trending::card_example", { language: "typescript" }),
    ], "github:trending::card_example")).toEqual({
      sourceId: "github:trending",
      params: { language: "typescript" },
    })
  })

  it("rejects an unknown instance", () => {
    expect(() => resolveInstanceHistoryTarget([], "missing::card_example"))
      .toThrow("Instance 'missing::card_example' not found")
  })
})
