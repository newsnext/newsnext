import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { isSourceProviderFile } from "../../modules/source"

const SOURCE_ROOT = resolve("/workspace/packages/source")
const REGISTRY_ROOT = resolve("/workspace/packages/registry")

describe("source WXT module", () => {
  it.each([
    ["src/providers/github.ts", true],
    ["src/providers/jike/index.ts", true],
    ["src/providers/jike/utils.ts", false],
    ["src/providers/telegram.test.ts", false],
    ["src/core/params.ts", false],
  ])("matches provider file %s", (filePath, expected) => {
    expect(
      isSourceProviderFile(resolve(SOURCE_ROOT, filePath), SOURCE_ROOT, REGISTRY_ROOT),
    ).toBe(expected)
  })

  it.each([
    ["src/github.json", true],
    ["src/netease-music.json", true],
    ["src/index.ts", false],
    ["src/github.test.ts", false],
  ])("matches JSON provider file %s", (filePath, expected) => {
    expect(
      isSourceProviderFile(resolve(REGISTRY_ROOT, filePath), SOURCE_ROOT, REGISTRY_ROOT),
    ).toBe(expected)
  })

  it("ignores files outside the source package", () => {
    expect(
      isSourceProviderFile(
        "/workspace/apps/extension/src/index.ts",
        SOURCE_ROOT,
        REGISTRY_ROOT,
      ),
    ).toBe(false)
  })
})
