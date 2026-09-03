import { describe, expect, it } from "vitest"
import { parseSourceRegistryState } from "./registry-cache"

describe("parseSourceRegistryState", () => {
  it("keeps valid registry status entries", () => {
    expect(parseSourceRegistryState([{
      checkedAt: 20,
      sourceIds: ["github:trending"],
      status: "ready",
      updatedAt: 10,
      url: "https://example.com/registry.json",
    }])).toEqual([{
      checkedAt: 20,
      error: undefined,
      sourceIds: ["github:trending"],
      status: "ready",
      updatedAt: 10,
      url: "https://example.com/registry.json",
    }])
  })

  it("drops invalid entries and optional timestamps", () => {
    expect(parseSourceRegistryState([
      null,
      { checkedAt: Number.NaN, sourceIds: [], status: "ready", url: "https://invalid.example" },
      { checkedAt: 20, sourceIds: [1], status: "ready", url: "https://invalid.example" },
      {
        checkedAt: 20,
        sourceIds: [],
        status: "stale",
        updatedAt: Number.POSITIVE_INFINITY,
        url: "https://example.com/registry.json",
      },
    ])).toEqual([{
      checkedAt: 20,
      error: undefined,
      sourceIds: [],
      status: "stale",
      updatedAt: undefined,
      url: "https://example.com/registry.json",
    }])
  })
})
