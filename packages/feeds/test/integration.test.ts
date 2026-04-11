import type { FeedParamSchema } from "../src/typings/feeds"
import { describe, expect, it } from "vitest"
import { providers } from "../src/index"

// Increase timeout for network requests
const TIMEOUT = 10000

const PROVIDER_ID = process.env.PROVIDER_ID
// Only run integration tests if LIVE_TEST is set
const describeIntegration = PROVIDER_ID || process.env.LIVE_TEST ? describe : describe.skip

describe("provider has default feed", () => {
  for (const [providerId, providerDefinition] of Object.entries(providers)) {
    it(`${providerId} has default`, async () => {
      expect(Object.keys(providerDefinition.feeds).includes("default")).toBe(true)
    })
  }
})

describeIntegration("feed Integration Tests", () => {
  for (const [providerId, providerDefinition] of Object.entries(providers)) {
    describe(providerId, () => {
      for (const [feedId, feed] of Object.entries(providerDefinition.feeds)) {
        const fullFeedId = `${providerId}:${feedId}`
        if (!feed.loader) {
          it.skip(`${fullFeedId} (No loader)`, () => {})
          continue
        }

        if (PROVIDER_ID && providerId !== PROVIDER_ID) {
          it.skip(`${fullFeedId} (Not the provider ID)`, () => {})
          continue
        }

        it(`should fetch ${fullFeedId} successfully`, async () => {
          const params: Record<string, any> = {}
          if (feed.params) {
            for (const [key, param] of Object.entries(feed.params as Record<string, FeedParamSchema>)) {
              params[key] = param.default
            }
          }

          try {
            const items = await feed.loader(params)

            // Basic assertions
            expect(Array.isArray(items)).toBe(true)

            // Some feeds might return empty arrays if there's no news,
            // but we shouldn't have errors.
            // If we want to be strict, we can expect length > 0
            expect(items.length).toBeGreaterThan(0)

            if (items.length > 0) {
              const firstItem = items[0]
              expect(firstItem).toHaveProperty("title")
              expect(firstItem).toHaveProperty("url")
              expect(firstItem.title).toBeTruthy()
              expect(firstItem.url).toBeTruthy()
            }
          } catch (error: any) {
            console.error(`Error fetching ${fullFeedId}:`, error)
            throw error
          }
        }, TIMEOUT)
      }
    })
  }
})
