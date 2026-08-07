import { describe, expect, it } from "vitest"
import {
  buildSourceCacheKey,
  selectSourceCacheKeysToDelete,
} from "./cache-values"

describe("source cache values", () => {
  it("builds stable keys regardless of parameter order", () => {
    expect(buildSourceCacheKey("test:latest", 2, {
      page: 1,
      query: "news",
    })).toBe(buildSourceCacheKey("test:latest", 2, {
      query: "news",
      page: 1,
    }))
  })

  it("removes entries that have not been used within the retention window", () => {
    expect(selectSourceCacheKeysToDelete([
      { key: "recent", size: 1, usedAt: 90 },
      { key: "expired", size: 1, usedAt: 50 },
    ], 100, 10, 50)).toEqual(["expired"])
  })

  it("keeps the most recently used entries within the capacity limit", () => {
    expect(selectSourceCacheKeysToDelete([
      { key: "oldest", size: 1, usedAt: 1 },
      { key: "newest", size: 1, usedAt: 3 },
      { key: "middle", size: 1, usedAt: 2 },
    ], 10, 2, 100)).toEqual(["oldest"])
  })

  it("removes entries with invalid usage timestamps", () => {
    expect(selectSourceCacheKeysToDelete([
      { key: "invalid", size: 1, usedAt: Number.NaN },
    ], 10)).toEqual(["invalid"])
  })

  it("removes superseded versions for the same source parameters", () => {
    expect(selectSourceCacheKeysToDelete([
      { key: "test:latest:v1:{\"page\":1}", size: 1, usedAt: 3 },
      { key: "test:latest:v2:{\"page\":1}", size: 1, usedAt: 2 },
      { key: "test:latest:v1:{\"page\":2}", size: 1, usedAt: 1 },
    ], 10, 10, 100)).toEqual(["test:latest:v1:{\"page\":1}"])
  })

  it("keeps recent entries within the total size limit", () => {
    expect(selectSourceCacheKeysToDelete([
      { key: "newest", size: 6, usedAt: 3 },
      { key: "middle", size: 5, usedAt: 2 },
      { key: "oldest", size: 4, usedAt: 1 },
    ], 10, 10, 100, 10)).toEqual(["middle"])
  })
})
