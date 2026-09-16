import { describe, expect, it } from "vitest"
import { createEventCatalog, defineEventContract } from "./definition.js"
import { eventContracts } from "./index.js"
import { EmptyObject } from "./schema.js"

describe("event catalog", () => {
  const statusChanged = defineEventContract({
    description: "Status changed",
    name: "nativeIntegration.statusChanged",
    payload: EmptyObject,
  })

  it("indexes contracts by their declared names", () => {
    const catalog = createEventCatalog([statusChanged])

    expect(Object.keys(catalog)).toEqual(["nativeIntegration.statusChanged"])
    expect(catalog["nativeIntegration.statusChanged"]).toBe(statusChanged)
  })

  it("rejects duplicate names instead of replacing a contract", () => {
    expect(() => createEventCatalog([statusChanged, { ...statusChanged }]))
      .toThrow("Duplicate Event name 'nativeIntegration.statusChanged'")
  })

  it("publishes the background events both directions share", () => {
    expect(Object.keys(eventContracts).sort()).toEqual([
      "diagnostics.changed",
      "nativeIntegration.statusChanged",
    ])
  })
})
