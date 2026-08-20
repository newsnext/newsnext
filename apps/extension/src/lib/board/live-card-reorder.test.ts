import type { LiveCardLayoutItem } from "./live-card-reorder"
import { describe, expect, it } from "vitest"
import {
  getLiveCardMarqueeSelection,
  getLiveCardReorderDestinationIndex,
  reorderLiveCardGroup,
} from "./live-card-reorder"

const ITEMS: LiveCardLayoutItem[] = [
  { id: "a", top: 0, right: 400, bottom: 500, left: 0 },
  { id: "b", top: 0, right: 824, bottom: 500, left: 424 },
  { id: "c", top: 0, right: 1248, bottom: 500, left: 848 },
  { id: "d", top: 524, right: 400, bottom: 1024, left: 0 },
  { id: "e", top: 524, right: 824, bottom: 1024, left: 424 },
  { id: "f", top: 524, right: 1248, bottom: 1024, left: 848 },
]

describe("getLiveCardReorderDestinationIndex", () => {
  it("places a LiveCard before or after a slot in the same row", () => {
    expect(getLiveCardReorderDestinationIndex({
      items: ITEMS,
      sourceIds: ["a"],
      pointer: { x: 500, y: 250 },
    })).toBe(0)

    expect(getLiveCardReorderDestinationIndex({
      items: ITEMS,
      sourceIds: ["a"],
      pointer: { x: 750, y: 250 },
    })).toBe(1)
  })

  it("selects the nearest visual row before resolving its horizontal slot", () => {
    expect(getLiveCardReorderDestinationIndex({
      items: ITEMS,
      sourceIds: ["a"],
      pointer: { x: 100, y: 600 },
    })).toBe(2)

    expect(getLiveCardReorderDestinationIndex({
      items: ITEMS,
      sourceIds: ["a"],
      pointer: { x: 300, y: 950 },
    })).toBe(3)
  })

  it("preserves the source slot when it is alone in the selected row", () => {
    expect(getLiveCardReorderDestinationIndex({
      items: [
        ...ITEMS.slice(0, 3),
        { id: "d", top: 524, right: 824, bottom: 1024, left: 424 },
      ],
      sourceIds: ["d"],
      pointer: { x: 600, y: 800 },
    })).toBe(3)
  })

  it("treats selected LiveCards as one block when resolving an insertion slot", () => {
    expect(getLiveCardReorderDestinationIndex({
      items: ITEMS,
      sourceIds: ["b", "e"],
      pointer: { x: 1200, y: 800 },
    })).toBe(4)
  })
})

describe("reorderLiveCardGroup", () => {
  it("preserves the selected LiveCards' board order", () => {
    expect(reorderLiveCardGroup(
      ["a", "b", "c", "d", "e", "f"],
      ["e", "b"],
      3,
    )).toEqual(["a", "c", "d", "b", "e", "f"])
  })
})

describe("getLiveCardMarqueeSelection", () => {
  it("selects every intersecting LiveCard and preserves an additive selection", () => {
    expect(getLiveCardMarqueeSelection({
      initialIds: ["a"],
      items: ITEMS,
      marquee: { top: 450, right: 900, bottom: 700, left: 350 },
    })).toEqual(["a", "b", "c", "d", "e", "f"])
  })

  it("does not select a LiveCard when the marquee only touches its edge", () => {
    expect(getLiveCardMarqueeSelection({
      items: ITEMS,
      marquee: { top: 500, right: 400, bottom: 524, left: 0 },
    })).toEqual([])
  })
})
