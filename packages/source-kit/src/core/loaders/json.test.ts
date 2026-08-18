import { describe, expect, it } from "vitest"
import { resolveJsonMetadata } from "./json"

describe("resolveJsonMetadata", () => {
  it("selects display metadata from the complete response", () => {
    const json = {
      result: {
        coverImgUrl: "https://example.com/cover.jpg",
        description: "Frequently updated tracks",
        homeUrl: "https://example.com/charts/rising",
        name: "Rising Chart",
      },
    }

    expect(resolveJsonMetadata(
      json,
      {
        badge: "result.coverImgUrl",
        desc: "result.description",
        home: "result.homeUrl",
        title: "result.name",
      },
      {
        vars: {},
        json,
        index: 0,
        params: {},
        requestUrl: "https://example.com/playlist",
      },
    )).toEqual({
      badge: "https://example.com/cover.jpg",
      desc: "Frequently updated tracks",
      home: "https://example.com/charts/rising",
      title: "Rising Chart",
    })
  })
})
