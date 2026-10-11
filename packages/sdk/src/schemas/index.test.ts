import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  actionManifestSchema,
  firstJsonSchemaIssue,
  insightManifestSchema,
  paramsSchema,
  pluginManifestSchema,
  sourceManifestSchema,
} from "./index"

describe("portable manifest schemas", () => {
  it("validates all four manifest kinds and parameter definitions", () => {
    expect(firstJsonSchemaIssue(pluginManifestSchema, { name: "Example" })).toBeUndefined()
    expect(firstJsonSchemaIssue(pluginManifestSchema, { name: " " })).toBeDefined()

    expect(firstJsonSchemaIssue(actionManifestSchema, {
      description: "Run",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
    })).toBeUndefined()
    expect(firstJsonSchemaIssue(actionManifestSchema, {
      description: "Run",
      inputSchema: [],
      outputSchema: { type: "object" },
    })).toBeDefined()

    expect(firstJsonSchemaIssue(insightManifestSchema, {
      title: "Feed",
      view: { preset: "live-card", query: "feed" },
      data: { queries: { feed: { type: "latest", limit: 20 } } },
    })).toBeUndefined()
    expect(firstJsonSchemaIssue(insightManifestSchema, {
      data: { queries: { feed: { type: "latest", limit: 0 } } },
    })).toBeDefined()

    expect(firstJsonSchemaIssue(sourceManifestSchema, {
      title: "Feed",
      color: "slate",
      sources: { latest: { loader: { type: "external" } } },
    })).toBeUndefined()
    expect(firstJsonSchemaIssue(sourceManifestSchema, {
      title: "Feed",
      color: "slate",
      sources: { latest: {} },
    })).toBeDefined()

    expect(firstJsonSchemaIssue(paramsSchema, {
      limit: { type: "number", title: "Limit", default: 10 },
    })).toBeUndefined()
    expect(firstJsonSchemaIssue(paramsSchema, {
      limit: { type: "number", title: "Limit", default: "ten" },
    })).toBeDefined()
  })

  it("validates transforms in scalar and grouped fields", () => {
    const provider = (fields: object) => ({
      title: "Feed",
      color: "slate",
      sources: { latest: { loader: { type: "json", url: "https://example.com", fields } } },
    })
    expect(firstJsonSchemaIssue(sourceManifestSchema, provider({
      title: { select: "title", transform: ["strip_html", { op: "truncate", length: 80 }] },
      stats: { views: { select: "views", transform: "parse_compact_number" } },
    }))).toBeUndefined()
    for (const fields of [
      { title: { transform: "unknown" } },
      { stats: { views: { transform: { op: "truncate", length: -1 } } } },
    ]) {
      expect(firstJsonSchemaIssue(sourceManifestSchema, provider(fields))).toBeDefined()
    }
  })

  it("keeps skill examples compatible with their published schemas", async () => {
    const examples = new URL("../../../../skills/newsnext-sdk/references/examples/", import.meta.url)
    const manifests = [
      [sourceManifestSchema, "rss-provider/example.json"],
      [sourceManifestSchema, "json-provider/example.json"],
      [sourceManifestSchema, "html-provider/example.json"],
      [insightManifestSchema, "word-cloud-insight/insight.json"],
      [insightManifestSchema, "custom-html-insight/insight.json"],
    ] as const

    for (const [schema, path] of manifests) {
      const value: unknown = JSON.parse(await readFile(new URL(path, examples), "utf8"))
      expect(firstJsonSchemaIssue(schema, value), path).toBeUndefined()
    }
  })
})
