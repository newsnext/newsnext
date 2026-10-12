import { describe, expect, it } from "vitest"
import { resolveJsonMetadata } from "../../packages/source-kit/src/core/loaders/json"
import { compileSourceTemplate } from "../../packages/source-kit/src/core/template"
import github from "./github.json"
import { formatXueqiuPriceAnnotation } from "./xueqiu/market"
import { formatXueqiuFundAnnotation } from "./xueqiu/rankings"

describe("registry field formatting", () => {
  it("formats fund ratios as percentages without changing their stored values", () => {
    for (const [returnRate, expected] of [[0, "0%"], [0.123456, "12.35%"], [-0.015, "-1.5%"]]) {
      expect(formatXueqiuFundAnnotation({ title: "Fund", url: "https://xueqiu.com/S/TEST", attributes: { returnRate, returnPeriod: "Year" } })).toBe(`Year · ${expected}`)
    }
    for (const returnRate of [undefined, "", "invalid"]) {
      expect(formatXueqiuFundAnnotation({ title: "Fund", url: "https://xueqiu.com/S/TEST", attributes: returnRate === undefined ? undefined : { returnRate } })).toBeUndefined()
    }
  })
  it("formats zero, negative and missing stock percentages", () => {
    for (const [percent, expected] of [[0, "0%"], [-1.5, "-1.5%"], [null, "--"], [undefined, "--"]]) {
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
    ]) {
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
  it("falls back from blank GitHub comment text to its author and from missing authors to Comment", () => {
    const field = github.sources["issue-comments"].loader.fields.title
    for (const [body, author, expected] of [["  ", { login: "author" }, "author"], ["", null, "Comment"], ["", { login: "" }, "Comment"], ["Body", null, "Body"]]) {
      const json = { body, author }
      expect(resolveJsonMetadata(json, { title: field }, { vars: {}, params: {}, json, index: 0, requestUrl: "https://github.com/" })?.title).toBe(expected)
    }
  })
  it("builds Trending paths for empty and encoded language slugs", () => {
    for (const [language, expected] of [["", "/trending/"], ["typescript", "/trending/typescript"], ["c++", "/trending/c%2B%2B"]]) {
      expect(compileSourceTemplate(github.sources.trending.loader.url, { location: "github:trending.loader.url", slot: "request" }).render({ scope: { params: { language } } })).toBe(expected)
    }
  })
})
