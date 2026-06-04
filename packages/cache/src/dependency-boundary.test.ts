import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const cacheSourceRoot = import.meta.dirname
const forbiddenDatabaseDetails = [
  ["drizzle", "orm"].join("-"),
  ["drizzle", "kit"].join("-"),
  "CREATE TABLE",
  "ON CONFLICT",
]

describe("cache package dependency boundary", () => {
  it("keeps database adapters in the database package", () => {
    for (const file of listTypeScriptFiles(cacheSourceRoot)) {
      const source = readFileSync(file, "utf8")

      for (const forbiddenDetail of forbiddenDatabaseDetails)
        expect(source, file).not.toContain(forbiddenDetail)
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

      return file.endsWith(".ts") && !file.endsWith(".d.ts") && !file.endsWith(".test.ts") ? [file] : []
    })
}
