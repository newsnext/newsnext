import type { NewsItem } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { getNewItemUrls } from "./use-new-items"

function item(url: string): NewsItem {
  return { title: url, url }
}

describe("getNewItemUrls", () => {
  it("returns urls absent from the previous items", () => {
    const previous = [item("a"), item("b")]
    const next = [item("b"), item("c"), item("d")]
    expect([...getNewItemUrls(previous, next)].sort()).toEqual(["c", "d"])
  })

  it("returns empty sets on first load or empty results", () => {
    expect(getNewItemUrls([], [item("a")]).size).toBe(0)
    expect(getNewItemUrls([item("a")], []).size).toBe(0)
  })

  it("returns an empty set when nothing changed", () => {
    const previous = [item("a"), item("b")]
    expect(getNewItemUrls(previous, [...previous]).size).toBe(0)
  })
})
