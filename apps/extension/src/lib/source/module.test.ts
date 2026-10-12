import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { isSourceProviderFile } from "../../../modules/source"

const REGISTRY_ROOT = resolve("/workspace/registry")

describe("source WXT module", () => {
  it.each([
    ["src/github.js", true],
    ["src/jike/index.js", true],
    ["src/jike/utils.js", false],
    ["src/telegram.test.js", false],
    ["src/core/params.js", false],
    ["src/legacy.ts", false],
  ])("matches provider file %s", (filePath, expected) => {
    expect(
      isSourceProviderFile(resolve(REGISTRY_ROOT, filePath), REGISTRY_ROOT),
    ).toBe(expected)
  })

  it.each([
    ["src/github.json", true],
    ["src/netease-music.json", true],
    ["src/index.js", true],
    ["src/github.test.js", false],
  ])("matches JSON provider file %s", (filePath, expected) => {
    expect(
      isSourceProviderFile(resolve(REGISTRY_ROOT, filePath), REGISTRY_ROOT),
    ).toBe(expected)
  })

  it("ignores files outside the source package", () => {
    expect(
      isSourceProviderFile(
        "/workspace/apps/extension/src/index.js",
        REGISTRY_ROOT,
      ),
    ).toBe(false)
  })
})
