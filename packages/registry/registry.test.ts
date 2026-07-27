import { describe, expect, it } from "vitest"
import sourceRegistry from "./registry.json" with { type: "json" }

describe("source registry", () => {
  it("builds a flat registry without provider containers", () => {
    for (const [id, source] of Object.entries(sourceRegistry)) {
      expect(id.split(":")).toHaveLength(2)
      expect("sources" in source, id).toBe(false)
      expect(source.provider.title, id).toBeTypeOf("string")
    }
  })
})
