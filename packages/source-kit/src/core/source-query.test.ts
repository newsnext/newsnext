import { describe, expect, it } from "vitest"
import { resolveSourceQuery } from "./base-url"

describe("source query parameters", () => {
  it("encodes values once and preserves unrelated query parameters and fragments", () => {
    const url = new URL(resolveSourceQuery("https://example.com/path?keep=yes&q=old#section", {
      q: "中文 c++ & a/b",
      count: 0,
      enabled: false,
    }))
    expect(url.searchParams.get("q")).toBe("中文 c++ & a/b")
    expect(url.searchParams.getAll("q")).toEqual(["中文 c++ & a/b"])
    expect(url.searchParams.get("keep")).toBe("yes")
    expect(url.searchParams.get("count")).toBe("0")
    expect(url.searchParams.get("enabled")).toBe("false")
    expect(url.hash).toBe("#section")
  })

  it("removes blank optional keys without leaving a trailing query separator", () => {
    expect(resolveSourceQuery("https://example.com/path?author=old", { author: "", since: null }))
      .toBe("https://example.com/path")
  })
})
