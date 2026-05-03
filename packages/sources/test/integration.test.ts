import type { SourceParamSchema } from "../src/typings/sources"
import { describe, expect, it } from "vitest"
import { providers } from "../src/index"

// Increase timeout for network requests
const TIMEOUT = 10000

const PROVIDER_ID = process.env.PROVIDER_ID
// Only run integration tests if LIVE_TEST is set
const describeIntegration = PROVIDER_ID || process.env.LIVE_TEST ? describe : describe.skip

describe("provider has default source", () => {
  for (const [providerId, providerDefinition] of Object.entries(providers)) {
    it(`${providerId} has default`, async () => {
      expect(Object.keys(providerDefinition.sources).includes("default")).toBe(true)
    })
  }
})

describeIntegration("source Integration Tests", () => {
  for (const [providerId, providerDefinition] of Object.entries(providers)) {
    describe(providerId, () => {
      for (const [sourceId, source] of Object.entries(providerDefinition.sources)) {
        const fullSourceId = `${providerId}:${sourceId}`
        if (!source.loader) {
          it.skip(`${fullSourceId} (No loader)`, () => {})
          continue
        }

        if (PROVIDER_ID && providerId !== PROVIDER_ID) {
          it.skip(`${fullSourceId} (Not the provider ID)`, () => {})
          continue
        }

        it(`should fetch ${fullSourceId} successfully`, async () => {
          const params: Record<string, any> = {}
          if (source.params) {
            for (const [key, param] of Object.entries(source.params as Record<string, SourceParamSchema>)) {
              params[key] = param.default
            }
          }

          try {
            const items = await source.loader(params)

            // Basic assertions
            expect(Array.isArray(items)).toBe(true)

            // Some sources might return empty arrays if there's no news,
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
            console.error(`Error fetching ${fullSourceId}:`, error)
            throw error
          }
        }, TIMEOUT)
      }
    })
  }
})
