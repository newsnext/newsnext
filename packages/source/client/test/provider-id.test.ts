import { readFileSync } from "node:fs"
import path from "node:path"
import { $provider } from "@newsnext/source-shared/utils/source"
import { describe, expect, it } from "vitest"

describe("provider IDs", () => {
  it("preserves explicit provider IDs and indexes sources by key", () => {
    const provider = $provider({
      id: "custom-provider",
      title: "Custom Provider",
      color: "blue",
      sources: [
        {
          key: "custom-source",
          title: "Default",
          loader: async () => [],
        },
      ],
    })

    expect(provider.id).toBe("custom-provider")
    expect(provider.sources["custom-source"]).toMatchObject({
      key: "custom-source",
      title: "Default",
    })
  })

  it("generates provider registry keys from provider IDs with filename fallback", () => {
    const generatedIndex = readFileSync(path.resolve(import.meta.dirname, "../src/index.ts"), "utf8")

    expect(generatedIndex).toMatch(/\[provider_\d+\.id \?\? "bilibili"\]: provider_\d+/)
    expect(generatedIndex).toMatch(/\[provider_\d+\.id \?\? "cls"\]: provider_\d+/)
  })
})
