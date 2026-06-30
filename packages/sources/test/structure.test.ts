import { describe, expect, it } from "vitest"
import { providers } from "../src"

describe("source Structure Tests", () => {
  it("registers tieba default source", () => {
    expect(providers.tieba.sources.default).toMatchObject({
      providerTitle: "百度贴吧",
      title: "热议",
      type: "hottest",
      category: "china",
      home: "https://tieba.baidu.com",
    })
  })

  for (const [providerId, providerDefinition] of Object.entries(providers)) {
    describe(providerId, () => {
      for (const [sourceId, source] of Object.entries(providerDefinition.sources)) {
        it(`should have valid structure for ${sourceId}`, () => {
          expect(typeof source.loader).toBe("function")

          if (source.params) {
            expect(typeof source.params).toBe("object")
            for (const [_paramKey, param] of Object.entries(source.params)) {
              expect(param).toHaveProperty("default")
            }
          }
        })
      }
    })
  }
})
