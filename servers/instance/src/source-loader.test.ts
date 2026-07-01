import { describe, expect, it } from "vitest"
import { buildSourceCacheKey } from "./source-loader"

describe("source loader", () => {
  it("builds cache keys with normalized params", () => {
    expect(buildSourceCacheKey("json:feed", {
      itemsPath: "items",
      page: 2,
    })).toBe("json:feed:{\"itemsPath\":\"items\",\"page\":2}")
  })

  it("builds stable cache keys for object params", () => {
    expect(buildSourceCacheKey("json:feed", {
      headers: {
        Authorization: "Bearer token",
        Accept: "application/json",
      },
    })).toBe("json:feed:{\"headers\":{\"Accept\":\"application/json\",\"Authorization\":\"Bearer token\"}}")
  })
})
