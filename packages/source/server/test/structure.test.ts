import { describe, expect, it } from "vitest"
import { providers } from "../src"

describe("source Structure Tests", () => {
  it("registers coolapk default source", () => {
    expect(providers.coolapk.sources.default).toMatchObject({
      providerTitle: "CoolAPK",
      title: "Today",
      type: "hottest",
      home: "https://coolapk.com",
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
