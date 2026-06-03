import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const apiRoot = path.resolve(import.meta.dirname, "..")
const forbiddenInstancePackage = ["@newsnext", "instance"].join("/")

describe("api dependency boundary", () => {
  it("does not import the instance package directly", () => {
    const checkedFiles = [
      path.resolve(apiRoot, "package.json"),
      ...listTypeScriptFiles(apiRoot),
    ]

    for (const file of checkedFiles) {
      expect(readFileSync(file, "utf8"), file).not.toContain(forbiddenInstancePackage)
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
