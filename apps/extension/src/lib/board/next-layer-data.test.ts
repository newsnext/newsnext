import { describe, expect, it } from "vitest"
import { selectNextLayerInstanceIds } from "./next-layer-data"

describe("next Layer instance selection", () => {
  const boardInstanceIds = ["one", "two", "three"]

  it("selects every Board Instance", () => {
    expect(selectNextLayerInstanceIds(boardInstanceIds, { scope: "board" }))
      .toEqual(boardInstanceIds)
  })

  it("selects one or more requested Board Instances", () => {
    expect(selectNextLayerInstanceIds(boardInstanceIds, {
      scope: "instances",
      instanceIds: ["three", "one"],
    })).toEqual(["three", "one"])
  })

  it("removes duplicates and Instances outside the Board", () => {
    expect(selectNextLayerInstanceIds(boardInstanceIds, {
      scope: "instances",
      instanceIds: ["two", "missing", "two"],
    })).toEqual(["two"])
  })
})
