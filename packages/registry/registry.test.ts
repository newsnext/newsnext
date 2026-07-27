import { describe, expect, it } from "vitest"
import { executableLoaders, resolveSources } from "./loaders"
import sourceRegistry from "./registry.json" with { type: "json" }

describe("source registry", () => {
  it("builds a flat registry without provider containers", () => {
    for (const [id, source] of Object.entries(sourceRegistry)) {
      expect(id.split(":")).toHaveLength(2)
      expect("sources" in source, id).toBe(false)
      expect(source.provider.title, id).toBeTypeOf("string")
    }
  })

  it("stores executable source configuration in JSON and binds only its loader", () => {
    expect(sourceRegistry["cls:telegraph"]).toMatchObject({
      provider: {
        title: "财联社",
      },
      metadata: {
        title: "电报",
      },
    })
    expect(sourceRegistry["cls:telegraph"]).not.toHaveProperty("loader")
    expect(executableLoaders["cls:telegraph"]).toBeTypeOf("function")
    expect(resolveSources(sourceRegistry)["cls:telegraph"]).toMatchObject({
      provider: {
        title: "财联社",
      },
      title: "电报",
      loader: expect.any(Function),
    })
  })
})
