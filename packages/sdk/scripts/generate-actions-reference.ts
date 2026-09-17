// Generates the Action catalog reference for the NewsNext SDK skill from the
// TypeScript action contracts, so the documented API cannot drift from the
// implementation. Run from the web checkout:
//   bun packages/sdk/scripts/generate-actions-reference.ts
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { actionContracts, eventContracts } from "../src/action/index.ts"

interface Schema { [key: string]: unknown }

function describe(schema: Schema, depth: number): string {
  if (depth > 4) return "…"
  const value = schema as Record<string, unknown>
  if (typeof value.const === "string") return JSON.stringify(value.const)
  if (Array.isArray(value.enum)) {
    return (value.enum as unknown[]).map(entry => JSON.stringify(entry)).join(" | ")
  }
  if (Array.isArray(value.anyOf)) {
    return (value.anyOf as Schema[]).map(entry => describe(entry, depth + 1)).join(" | ")
  }
  switch (value.type) {
    case "string": return "string"
    case "integer":
    case "number": {
      const min = typeof value.minimum === "number" ? ` ≥ ${value.minimum}` : ""
      const max = typeof value.maximum === "number" ? ` ≤ ${value.maximum}` : ""
      return `${value.type}${min}${max}`
    }
    case "boolean": return "boolean"
    case "array": {
      const items = value.items as Schema | undefined
      return `${items ? describe(items, depth + 1) : "unknown"}[]`
    }
    case "object": {
      const properties = (value.properties ?? {}) as Record<string, Schema>
      const required = new Set((value.required ?? []) as string[])
      const entries = Object.entries(properties).map(
        ([name, field]) => `${name}${required.has(name) ? "" : "?"}: ${describe(field, depth + 1)}`,
      )
      if (entries.length > 0) return `{ ${entries.join("; ")} }`
      const patterns = value.patternProperties as Record<string, Schema> | undefined
      const patternsEntries = Object.entries(patterns ?? {})
      if (patternsEntries.length === 1 && patternsEntries[0]![0] === "^.*$") {
        return `Record<string, ${describe(patternsEntries[0]![1]!, depth + 1)}>`
      }
      // An empty shape without additionalProperties: false is a TypeScript-only
      // contract (Type.Unsafe with an empty object): the runtime shape is
      // richer than the schema, so say so instead of printing a bare {}.
      if (value.additionalProperties === false) return "{}"
      return "{…}"
    }
    default: return "unknown"
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const names = Object.keys(actionContracts).sort()
const lines = [
  "# Action catalog",
  "",
  "Generated from `packages/sdk/src/action/*.ts`. Regenerate with",
  "`bun packages/sdk/scripts/generate-actions-reference.ts` from the web",
  "checkout after changing an action contract. Call actions as",
  "`client.actions.<domain>.<method>(input, options)` inside `newsnext eval`;",
  "the evaluated script receives a preconfigured `client` global.",
  "This catalog covers `client.actions.*` and background events; `status`,",
  "`history.*`, `liveCards.data`, `liveWidgets.data`, `run`, and `fetch` are",
  "documented in sdk.md.",
  "`{…}` marks a TypeScript-only result shape: see the matching type in",
  "`@newsnext/sdk` models.",
  "",
]
for (const name of names) {
  const contract = actionContracts[name]!
  const params = describe(contract.params as Schema, 0)
  const result = describe(contract.result as Schema, 0)
  lines.push(
    `### ${name}`,
    "",
    `*${contract.kind}* — ${contract.description}`,
    "",
    "```ts",
    `await client.actions.${name}(${params === "{}" ? "" : `input: ${params}`})`,
    `// => ${result}`,
    "```",
    "",
  )
}
const eventNames = Object.keys(eventContracts).sort()
if (eventNames.length > 0) {
  lines.push("## Events", "")
  for (const name of eventNames) {
    const event = eventContracts[name]!
    lines.push(
      `### ${name}`,
      "",
      event.description,
      "",
      "```ts",
      `// payload: ${describe(event.payload as Schema, 0)}`,
      "```",
      "",
    )
  }
}
writeFileSync(join(root, "skills/newsnext-sdk/references/actions.md"), lines.join("\n"))
console.log(`Wrote ${names.length} actions and ${eventNames.length} events`)
