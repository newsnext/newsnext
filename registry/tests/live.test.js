import process from "node:process"
import { createClient } from "@newsnext/sdk"
import { describe, expect, it } from "vitest"

// Run explicitly against a connected NewsNext runtime, including its login state.
const client = createClient({
  workerId: process.env.NEWSNEXT_WORKER_ID || undefined,
  timeoutMs: 60000,
})
const availableSources = await client.actions.source.list({}, { timeoutMs: 5000 })
const sourceIds = process.env.NEWSNEXT_SOURCE_IDS
  ? process.env.NEWSNEXT_SOURCE_IDS.split(",").map(id => id.trim()).filter(Boolean)
  : availableSources.map(source => source.id).sort()
const params = JSON.parse(process.env.NEWSNEXT_SOURCE_PARAMS || "{}")
if (!sourceIds.length) throw new Error("No Sources selected for live testing")
for (const sourceId of sourceIds) {
  if (!availableSources.some(source => source.id === sourceId)) {
    throw new Error(`Source "${sourceId}" is not available in the connected runtime`)
  }
}

describe("live Sources", () => {
  for (const sourceId of sourceIds) {
    it(sourceId, async () => {
      const result = await client.run({ sourceId, params: params[sourceId] })
      expect(result.execution.sourceId).toBe(sourceId)
      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data.length).toBeLessThanOrEqual(50)
      for (const item of result.data) {
        expect(item.title.trim()).not.toBe("")
        expect(new URL(item.url).protocol).toMatch(/^https?:$/)
        if (item.publishedAt !== undefined) {
          expect(Number.isFinite(item.publishedAt)).toBe(true)
        }
      }
    })
  }
})
