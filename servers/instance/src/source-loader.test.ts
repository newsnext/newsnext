import { describe, expect, it } from "vitest"
import { buildSourceCacheKey } from "./source-loader"

describe("source loader", () => {
  it("builds cache keys with normalized params", () => {
    expect(buildSourceCacheKey("json:default", {
      itemsPath: "items",
      page: 2,
    })).toBe("json:default:{\"itemsPath\":\"items\",\"page\":2}")
  })

  it("builds stable cache keys for object params", () => {
    expect(buildSourceCacheKey("json:default", {
      headers: {
        Authorization: "Bearer token",
        Accept: "application/json",
      },
    })).toBe("json:default:{\"headers\":{\"Accept\":\"application/json\",\"Authorization\":\"Bearer token\"}}")
  })
})
