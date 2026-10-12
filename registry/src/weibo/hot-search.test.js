import { validateSourceLoaderOutput } from "@newsnext/source-kit/core"
import { describe, expect, it } from "vitest"
import { parseWeiboHotSearch } from "./hot-search"

describe("weibo hot search", () => {
  it("uses returned links and encodes keyword fallbacks", () => {
    const items = parseWeiboHotSearch({ data: { realtime: [
      { rank: 0, note: "Direct", url: "http://s.weibo.com/topic?q=test", icon: "https://example.com/icon.png" },
      { rank: 1, word: "a & b" },
      { realpos: 2, name: "Scheme", word_scheme: "#topic#" },
    ] } })
    expect(validateSourceLoaderOutput({ items }, "https://weibo.com/").items).toMatchObject([
      { title: "Direct", url: "https://s.weibo.com/topic?q=test", mark: { kind: "trend" } },
      { title: "a & b", url: "https://s.weibo.com/weibo?q=a%20%26%20b" },
      { title: "Scheme", url: "https://s.weibo.com/weibo?q=%23topic%23" },
    ])
  })
  it("filters ads and incomplete entries, using bands when realtime is empty", () => {
    const items = parseWeiboHotSearch({ data: { realtime: [], band_list: [
      { rank: 1, word: "Ad", is_ad: 1 },
      { word: "Unranked" },
      { rank: 2, note: "Missing URL" },
      { rank: 3, url: "/missing-title" },
      { realpos: 0, word: "Band" },
    ] } })
    expect(items.map(item => item.title)).toEqual(["Band"])
  })
})
