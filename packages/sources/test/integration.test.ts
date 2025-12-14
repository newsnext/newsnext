import type { Parameter } from "../src/typings/sources"
import { describe, expect, it } from "vitest"
import { sources } from "../src/index"

// Increase timeout for network requests
const TIMEOUT = 10000

const SOURCEID = process.env.SOURCEID
// Only run integration tests if LIVE_TEST is set
const describeIntegration = SOURCEID || process.env.LIVE_TEST ? describe : describe.skip

describe("source has default", () => {
  for (const [namespace, subsource] of Object.entries(sources)) {
    it(`${namespace} has default`, async () => {
      expect(Object.keys(subsource).includes("default")).toBe(true)
    })
  }
})

describeIntegration("source Integration Tests", () => {
  for (const [namespace, subsource] of Object.entries(sources)) {
    describe(namespace, () => {
      for (const [sourceId, source] of Object.entries(subsource)) {
        const fullSourceId = `${namespace}:${sourceId}`
        if (!source.fetcher) {
          it.skip(`${fullSourceId} (No fetcher)`, () => {})
          continue
        }

        if (SOURCEID && namespace !== SOURCEID) {
          it.skip(`${fullSourceId} (Not the source ID)`, () => {})
          continue
        }

        it(`should fetch ${fullSourceId} successfully`, async () => {
          const params: Record<string, any> = {}
          if (source.params) {
            for (const [key, param] of Object.entries(source.params as Record<string, Parameter>)) {
              params[key] = param.default
            }
          }

          try {
            const items = await source.fetcher(params)

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
