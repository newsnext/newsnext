import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { isSourceProviderFile } from "../../../modules/source"

const REGISTRY_ROOT = resolve("/workspace/packages/registry")

describe("source WXT module", () => {
  it.each([
    ["src/github.ts", true],
    ["src/jike/index.ts", true],
    ["src/jike/utils.ts", false],
    ["src/telegram.test.ts", false],
    ["src/core/params.ts", false],
  ])("matches provider file %s", (filePath, expected) => {
    expect(
      isSourceProviderFile(resolve(REGISTRY_ROOT, filePath), REGISTRY_ROOT),
    ).toBe(expected)
  })

  it.each([
    ["src/github.json", true],
    ["src/netease-music.json", true],
    ["src/index.ts", true],
    ["src/github.test.ts", false],
  ])("matches JSON provider file %s", (filePath, expected) => {
    expect(
      isSourceProviderFile(resolve(REGISTRY_ROOT, filePath), REGISTRY_ROOT),
    ).toBe(expected)
  })

  it("ignores files outside the source package", () => {
    expect(
      isSourceProviderFile(
        "/workspace/apps/extension/src/index.ts",
        REGISTRY_ROOT,
      ),
    ).toBe(false)
  })
})
