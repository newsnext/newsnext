import { describe, expect, it } from "vitest"
import { sources } from "../src/index"

describe("source Structure Tests", () => {
  for (const [groupKey, sourceGroup] of Object.entries(sources)) {
    describe(groupKey, () => {
      for (const [sourceId, source] of Object.entries(sourceGroup)) {
        it(`should have valid structure for ${sourceId}`, () => {
          // Check if fetcher exists
          if (source.fetcher) {
            expect(typeof source.fetcher).toBe("function")
          } else {
            // If no fetcher, it might be valid if it's WIP, but generally we expect a fetcher
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
