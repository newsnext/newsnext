import { describe, expect, it } from "vitest"
import { providers } from "@/index"

describe("source Structure Tests", () => {
  it("registers tieba default source", () => {
    expect(providers.tieba.sources.default).toMatchObject({
      name: "百度贴吧",
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
          // Check if loader exists
          if (source.loader) {
            expect(typeof source.loader).toBe("function")
          } else {
            // If no loader, it might be valid if it's WIP, but generally we expect a loader
            // verify other props
          }

          // Check params if they exist
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
