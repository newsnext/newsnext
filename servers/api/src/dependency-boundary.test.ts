import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const apiRoot = path.resolve(import.meta.dirname, "..")
const forbiddenRemoteUrlEnv = ["NEWSNEXT", "INSTANCE", "URL"].join("_")
const forbiddenInternalInstanceHost = `${["newsnext", "instance"].join("-")
}.internal`
const forbiddenDataDbBinding = ["DATA", "DB"].join("_")
const forbiddenCacheDbBinding = ["CACHE", "DB"].join("_")
const forbiddenDataDbPathEnv = ["NEWSNEXT", "DATA", "DB", "PATH"].join("_")
const forbiddenCacheDbPathEnv = ["NEWSNEXT", "CACHE", "DB", "PATH"].join("_")

describe("api dependency boundary", () => {
  it("uses the local instance package directly", () => {
    const instanceClient = readFileSync(path.resolve(apiRoot, "src/instance-client.ts"), "utf8")

    expect(instanceClient).toContain(["@newsnext", "instance"].join("/"))
  })

  it("does not depend on the instance server", () => {
    const checkedFiles = [
      path.resolve(apiRoot, "package.json"),
      ...listTypeScriptFiles(apiRoot),
    ]

    for (const file of checkedFiles) {
      const contents = readFileSync(file, "utf8")
      expect(contents, file).not.toContain(forbiddenRemoteUrlEnv)
      expect(contents, file).not.toContain(forbiddenInternalInstanceHost)
      expect(contents, file).not.toContain(forbiddenDataDbBinding)
      expect(contents, file).not.toContain(forbiddenCacheDbBinding)
      expect(contents, file).not.toContain(forbiddenDataDbPathEnv)
      expect(contents, file).not.toContain(forbiddenCacheDbPathEnv)
    }
  })
})

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const file = path.join(directory, entry)
      const stats = statSync(file)

      if (stats.isDirectory()) {
        if (entry === "node_modules" || entry === ".output") {
          return []
        }

        return listTypeScriptFiles(file)
      }

      return file.endsWith(".ts") && !file.endsWith(".d.ts") ? [file] : []
    })
}
