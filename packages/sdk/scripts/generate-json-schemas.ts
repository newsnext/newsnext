import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { portableJsonSchemas } from "../src/schemas/definitions"

const directory = fileURLToPath(
  new URL("../../../skills/newsnext-sdk/references/schemas/", import.meta.url),
)
const check = process.argv.includes("--check")

if (!check) await mkdir(directory, { recursive: true })

let stale = false
for (const [name, schema] of Object.entries(portableJsonSchemas)) {
  const path = join(directory, `${name}.json`)
  const expected = `${JSON.stringify(schema, null, 2)}\n`
  const actual = await readFile(path, "utf8").catch(() => undefined)
  if (actual === expected) continue
  if (check) {
    console.error(`Outdated generated schema: ${name}.json`)
    stale = true
  } else {
    await writeFile(path, expected)
    console.log(`Generated ${name}.json`)
  }
}

if (stale) process.exitCode = 1
