import { describe, expect, it } from "vitest"
import { resolveJsonMetadata } from "../../packages/source-kit/src/core/loaders/json"
import provider from "./netease-music.json"

describe("music artist and album composition", () => {
  it("joins projected artists and supports both response shapes", () => {
    for (const [json, expected] of [
      [{ ar: [{ name: "A" }, { name: "B" }], al: { name: "Album" } }, "A / B · Album"],
      [{ artists: [{ name: "A" }], album: { name: "Album" } }, "A · Album"],
      [{ ar: [], artists: [{ name: "A" }], al: null, album: { name: "Album" } }, "A · Album"],
      [{ ar: [{ name: "A" }] }, "A"],
      [{ album: { name: "Album" } }, "Album"],
      [{}, ""],
    ] as const) {
      expect(resolveJsonMetadata(json, {
        title: provider.defaults.loader.fields.attributes.artists,
      }, { vars: {}, json, index: 0, params: {}, requestUrl: "https://music.163.com/" })?.title ?? "")
        .toBe(expected)
    }
  })
})
