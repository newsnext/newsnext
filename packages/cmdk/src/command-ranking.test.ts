import type { CommandItemRegistration } from "./command-ranking"
import { describe, expect, it } from "vitest"
import { rankCommandItems } from "./command-ranking"

const items: CommandItemRegistration[] = [
  { id: "one", value: "Daily News", keywords: [], groupId: "first", disabled: false },
  { id: "two", value: "Hacker News", keywords: ["technology"], groupId: "first", disabled: false },
  { id: "three", value: "Technology", keywords: [], groupId: "second", disabled: true },
]

describe("command item ranking", () => {
  it("preserves registration order without a search", () => {
    const result = rankCommandItems(items, "")

    expect(result.orderedEnabledIds).toEqual(["one", "two"])
    expect([...result.groupOrder.keys()]).toEqual(["first", "second"])
  })

  it("filters and sorts items and groups by score", () => {
    const result = rankCommandItems(items, "technology")

    expect([...result.visibleIds]).toEqual(["two", "three"])
    expect([...result.groupOrder.keys()]).toEqual(["second", "first"])
    expect(result.orderedEnabledIds).toEqual(["two"])
  })
})
