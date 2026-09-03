import type { LiveCardLayoutItem } from "./live-card-reorder"
import { describe, expect, it } from "vitest"
import {
  getLiveCardReorderDestinationIndex,
  reorderLiveCard,
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
      sourceId: "a",
      pointer: { x: 500, y: 250 },
    })).toBe(0)

    expect(getLiveCardReorderDestinationIndex({
      items: ITEMS,
      sourceId: "a",
      pointer: { x: 750, y: 250 },
    })).toBe(1)
  })

  it("selects the nearest visual row before resolving its horizontal slot", () => {
    expect(getLiveCardReorderDestinationIndex({
      items: ITEMS,
      sourceId: "a",
      pointer: { x: 100, y: 600 },
    })).toBe(2)

    expect(getLiveCardReorderDestinationIndex({
      items: ITEMS,
      sourceId: "a",
      pointer: { x: 300, y: 950 },
    })).toBe(3)
  })

  it("preserves the source slot when it is alone in the target row", () => {
    expect(getLiveCardReorderDestinationIndex({
      items: [
        ...ITEMS.slice(0, 3),
        { id: "d", top: 524, right: 824, bottom: 1024, left: 424 },
      ],
      sourceId: "d",
      pointer: { x: 600, y: 800 },
    })).toBe(3)
  })
})

describe("reorderLiveCard", () => {
  it("moves one LiveCard to the destination", () => {
    expect(reorderLiveCard(
      ["a", "b", "c", "d", "e", "f"],
      "b",
      3,
    )).toEqual(["a", "c", "d", "b", "e", "f"])
  })
})
