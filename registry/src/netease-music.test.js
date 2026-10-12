import { describe, expect, it } from "vitest"
import { compileInterpolation } from "../../packages/source-kit/src/core/interpolation"
import { resolveJsonMetadata } from "../../packages/source-kit/src/core/loaders/json"
import provider from "./netease-music.json"

describe("music artist and album fields", () => {
  it("keeps artists and albums separate and composes annotation with separators", () => {
    const annotation = compileInterpolation(provider.defaults.loader.annotation)
    for (const [json, artists, album] of [
      [{ ar: [{ name: "A" }, { name: "B" }], al: { name: "Album" } }, "A / B", "Album"],
      [{ artists: [{ name: "A" }], album: { name: "Album" } }, "A", "Album"],
      [{ ar: [], artists: [{ name: "A" }], al: null, album: { name: "Album" } }, "A", "Album"],
      [{ ar: [{ name: "A" }] }, "A", ""],
      [{ album: { name: "Album" } }, "", "Album"],
      [{}, "", ""],
    ]) {
      const metadata = resolveJsonMetadata(json, {
        title: provider.defaults.loader.fields.author.name,
        desc: provider.defaults.loader.fields.attributes.album,
      }, { vars: {}, json, index: 0, params: {}, requestUrl: "https://music.163.com/" })
      expect(metadata?.title ?? "").toBe(artists)
      expect(metadata?.desc ?? "").toBe(album)
      expect(annotation.render({ scope: { item: {
        author: { name: metadata?.title },
        attributes: { album: metadata?.desc },
      } } }).trim()).toBe(`${artists} · ${album}`.trim())
    }
  })
})
