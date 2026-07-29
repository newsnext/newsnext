import { describe, expect, it } from "vitest"
import { resolveJsonMetadata } from "./json"

describe("resolveJsonMetadata", () => {
  it("selects display metadata from the complete response", () => {
    const json = {
      result: {
        coverImgUrl: "https://example.com/cover.jpg",
        description: "Frequently updated tracks",
        name: "Rising Chart",
      },
    }

    expect(resolveJsonMetadata(
      json,
      {
        badge: "result.coverImgUrl",
        desc: "result.description",
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
      title: "Rising Chart",
    })
  })
})
