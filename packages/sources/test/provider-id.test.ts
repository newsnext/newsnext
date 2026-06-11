import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { $provider } from "@/utils/source"

describe("provider IDs", () => {
  it("preserves explicit provider IDs and indexes sources by name", () => {
    const provider = $provider({
      id: "custom-provider",
      title: "Custom Provider",
      color: "blue",
      sources: [
        {
          name: "custom-source",
          title: "Default",
          loader: async () => [],
        },
      ],
    })

    expect(provider.id).toBe("custom-provider")
    expect(provider.sources["custom-source"]).toMatchObject({
      name: "custom-source",
      title: "Default",
    })
  })

  it("generates provider registry keys from provider IDs with filename fallback", () => {
    const generatedIndex = readFileSync(path.resolve(import.meta.dirname, "../src/index.ts"), "utf8")

    expect(generatedIndex).toContain("[provider_0.id ?? \"bilibili\"]: provider_0")
  })
})
