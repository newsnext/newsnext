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
      createInstance("github:trending::V1StGXR8_Z5j", { language: "typescript" }),
    ], "github:trending::V1StGXR8_Z5j")).toEqual({
      sourceId: "github:trending",
      params: { language: "typescript" },
    })
  })

  it("rejects an unknown instance", () => {
    expect(() => resolveInstanceHistoryTarget([], "missing::V1StGXR8_Z5j"))
      .toThrow("Instance 'missing::V1StGXR8_Z5j' not found")
  })
})
