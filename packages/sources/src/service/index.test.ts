import type { SourceOptions } from "../typings"
import { describe, expect, it } from "vitest"
import {
  buildSourceCacheKey,
  normalizeSourceParams,
  parseSourceId,
  SourceServiceError,
} from "./index"

describe("source service", () => {
  it("parses source ids with default sub-source ids", () => {
    expect(parseSourceId("rss")).toEqual({
      namespace: "rss",
      id: "default",
    })
  })

  it("throws for invalid source ids", () => {
    expect(() => parseSourceId("")).toThrowError(SourceServiceError)
  })

  it("normalizes parameter values using source parameter definitions", () => {
    const source = {
      params: {
        page: { type: "number", default: 1, title: "Page" },
        latest: { type: "switch", default: false, title: "Latest" },
        q: { type: "text", default: "top", title: "Query" },
      },
    } satisfies Pick<SourceOptions, "params">

    expect(normalizeSourceParams(source, {
      page: "2",
      latest: "1",
    })).toEqual({
      page: 2,
      latest: true,
      q: "top",
    })
  })

  it("builds cache keys with normalized params", () => {
    expect(buildSourceCacheKey("json:default", {
      itemsPath: "items",
      page: 2,
    })).toBe("json:default:{\"itemsPath\":\"items\",\"page\":2}")
  })
})
