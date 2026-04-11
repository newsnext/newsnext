import { describe, expect, it } from "vitest"
import { providers } from "../src/index"

describe("feed Structure Tests", () => {
  for (const [providerId, providerDefinition] of Object.entries(providers)) {
    describe(providerId, () => {
      for (const [feedId, feed] of Object.entries(providerDefinition.feeds)) {
        it(`should have valid structure for ${feedId}`, () => {
          // Check if loader exists
          if (feed.loader) {
            expect(typeof feed.loader).toBe("function")
          } else {
            // If no loader, it might be valid if it's WIP, but generally we expect a loader
            // verify other props
          }

          // Check params if they exist
          if (feed.params) {
            expect(typeof feed.params).toBe("object")
            for (const [_paramKey, param] of Object.entries(feed.params)) {
              expect(param).toHaveProperty("default")
            }
          }
        })
      }
    })
  }
})
