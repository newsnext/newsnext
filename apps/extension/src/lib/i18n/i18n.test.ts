import { describe, expect, it } from "vitest"
import { i18next } from "."
import { resolveLocale } from "./locale"
import { en } from "./resources/en"
import { zhCN } from "./resources/zh-CN"
import { zhTW } from "./resources/zh-TW"

function getPlaceholders(message: string): string[] {
  return [...message.matchAll(/\{\{(\w+)\}\}/gu)]
    .map(match => match[1] ?? "")
    .filter(Boolean)
    .toSorted()
}

function getCatalogPlaceholderMismatches(): string[] {
  const catalogs = { "zh-CN": zhCN, "zh-TW": zhTW }
  return (Object.keys(catalogs) as Array<keyof typeof catalogs>).flatMap(locale => (
    (Object.keys(en) as Array<keyof typeof en>).flatMap((key) => {
      const expected = getPlaceholders(en[key]).join("\0")
      const actual = getPlaceholders(catalogs[locale][key]).join("\0")
      return expected === actual ? [] : [`${locale}:${key}`]
    })
  ))
}

describe("resolveLocale", () => {
  it.each([
    ["zh-CN", "zh-CN"],
    ["zh-SG", "zh-CN"],
    ["zh-TW", "zh-TW"],
    ["zh-HK", "zh-TW"],
    ["en-US", "en"],
    ["ja-JP", "en"],
  ] as const)("maps %s to %s", (language, expected) => {
    expect(resolveLocale(language)).toBe(expected)
  })
})

describe("message catalogs", () => {
  it("uses the same placeholders in every locale", () => {
    expect(getCatalogPlaceholderMismatches()).toEqual([])
  })

  it("interpolates translated values through i18next", () => {
    expect(i18next.getFixedT("zh-CN")("instanceCount", { count: 3 })).toBe("3 个 Instance")
  })
})
