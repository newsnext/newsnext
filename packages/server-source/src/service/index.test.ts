import type { RegisteredSourceDefinition } from "../typings"
import { describe, expect, it } from "vitest"
import {
  normalizeSourceParams,
  parseSourceId,
  SourceServiceError,
} from "./index"

describe("source service", () => {
  it("parses provider-qualified source IDs", () => {
    expect(parseSourceId("rss:latest")).toEqual({
      provider: "rss",
      source: "latest",
    })
  })

  it("throws for invalid source IDs", () => {
    expect(() => parseSourceId("")).toThrowError(SourceServiceError)
    expect(() => parseSourceId("rss")).toThrowError(SourceServiceError)
    expect(() => parseSourceId("rss:latest:extra")).toThrowError(SourceServiceError)
  })

  it("normalizes parameter values using source parameter definitions", () => {
    const sourceDefinition = {
      params: {
        page: { type: "number", default: 1, title: "Page" },
        latest: { type: "switch", default: false, title: "Latest" },
        q: { type: "text", default: "top", title: "Query" },
      },
    } satisfies Pick<RegisteredSourceDefinition, "params">

    expect(normalizeSourceParams(sourceDefinition, {
      page: "2",
      latest: "1",
    })).toEqual({
      page: 2,
      latest: true,
      q: "top",
    })
  })

  it("normalizes multiselect values using parameter helpers", () => {
    const sourceDefinition = {
      params: {
        tags: {
          type: "multiselect",
          default: ["tech"],
          options: [
            { label: "Tech", value: "tech" },
            { label: "World", value: "world" },
          ],
          title: "Tags",
        },
      },
    } satisfies Pick<RegisteredSourceDefinition, "params">

    expect(normalizeSourceParams(sourceDefinition, {
      tags: "tech,world",
    })).toEqual({
      tags: ["tech", "world"],
    })
  })

  it("throws a source service error for invalid parameter values", () => {
    const sourceDefinition = {
      params: {
        headers: {
          type: "text",
          default: "{}",
          title: "Request Headers (JSON)",
          validate: (value) => {
            try {
              JSON.parse(String(value))
              return true
            } catch {
              return "Request Headers (JSON) must be valid JSON"
            }
          },
        },
      },
    } satisfies Pick<RegisteredSourceDefinition, "params">

    expect(() => normalizeSourceParams(sourceDefinition, {
      headers: "{invalid-json}",
    })).toThrowError("Request Headers (JSON) must be valid JSON")
  })

  it("parses default values into runtime output types", () => {
    const sourceDefinition = {
      params: {
        headers: {
          type: "text",
          default: "{}",
          title: "Request Headers (JSON)",
          parse: value => JSON.parse(String(value)) as Record<string, string>,
        },
      },
    } satisfies Pick<RegisteredSourceDefinition, "params">

    expect(normalizeSourceParams(sourceDefinition)).toEqual({
      headers: {},
    })
  })
})
