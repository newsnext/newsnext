import { describe, expect, it } from "vitest"
import { resolveJsonMetadata } from "../../packages/source-kit/src/core/loaders/json"
import { renderTemplate } from "../../packages/source-kit/src/core/template"
import github from "./github.json"
import { formatXueqiuPriceAnnotation } from "./xueqiu/market"

describe("registry field formatting", () => {
  it("formats zero, negative and missing stock percentages", () => {
    for (const [percent, expected] of [[0, "0%"], [-1.5, "-1.5%"], [null, "--"], [undefined, "--"]] as const) {
      expect(formatXueqiuPriceAnnotation({
        title: "Stock",
        url: "https://xueqiu.com/S/TEST",
        attributes: percent == null ? undefined : { changePercent: percent },
      })).toBe(`${expected} · --`)
    }
  })

  it("falls back to GitHub login avatars without constructing an empty avatar URL", () => {
    const source = github.sources.pulls
    for (const [author, expected] of [
      [{ avatarUrl: "https://example.com/avatar.png", displayLogin: "user" }, "https://example.com/avatar.png"],
      [{ avatarUrl: "", displayLogin: "user" }, "https://avatars.githubusercontent.com/user?s=64"],
      [{ displayLogin: "user" }, "https://avatars.githubusercontent.com/user?s=64"],
      [{}, undefined],
    ] as const) {
      const json = { author }
      expect(resolveJsonMetadata(json, { title: source.loader.fields.icon.src }, {
        vars: {},
        params: {},
        json,
        index: 0,
        requestUrl: "https://github.com/",
      })?.title).toBe(expected)
    }
  })

  it("builds Trending paths for empty and encoded language slugs", () => {
    for (const [language, expected] of [["", "/trending"], ["typescript", "/trending/typescript"], ["c++", "/trending/c%2B%2B"]]) {
      expect(renderTemplate(github.sources.trending.loader.url, { scope: { params: { language } } })).toBe(expected)
    }
  })
})
