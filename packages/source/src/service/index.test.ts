import type { RuntimeSource } from "@newsnext/source/typings"
import { describe, expect, it } from "vitest"
import { providers } from "../index"
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
    } satisfies Pick<RuntimeSource, "params">

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
          values: [
            { label: "Tech", value: "tech" },
            { label: "World", value: "world" },
          ],
          title: "Tags",
        },
      },
    } satisfies Pick<RuntimeSource, "params">

    expect(normalizeSourceParams(sourceDefinition, {
      tags: "tech,world",
    })).toEqual({
      tags: ["tech", "world"],
    })
  })

  it("applies declarative parameter transforms before validation", () => {
    const sourceDefinition = {
      params: {
        channel: {
          type: "text",
          default: "example",
          title: "Channel",
          transforms: [
            { type: "trim" },
            { type: "removePrefix", value: "@" },
            { type: "replace", search: "-", replacement: "_", all: true },
            { type: "lowercase" },
          ],
          pattern: "^[a-z_]+$",
        },
      },
    } satisfies Pick<RuntimeSource, "params">

    expect(normalizeSourceParams(sourceDefinition, {
      channel: "  @News-Channel  ",
    })).toEqual({
      channel: "news_channel",
    })
  })

  it("supports replacing only the first literal match", () => {
    const sourceDefinition = {
      params: {
        path: {
          type: "text",
          default: "a.b.c",
          title: "Path",
          transforms: [
            {
              type: "replace",
              search: ".",
              replacement: "/",
              all: false,
            },
          ],
        },
      },
    } satisfies Pick<RuntimeSource, "params">

    expect(normalizeSourceParams(sourceDefinition)).toEqual({
      path: "a/b.c",
    })
  })

  it("normalizes Telegram channel parameters declaratively", () => {
    expect(normalizeSourceParams(providers.telegram.sources.channel, {
      channel: "  @TestFlightCN  ",
    })).toEqual({
      channel: "TestFlightCN",
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
    } satisfies Pick<RuntimeSource, "params">

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
    } satisfies Pick<RuntimeSource, "params">

    expect(normalizeSourceParams(sourceDefinition)).toEqual({
      headers: {},
    })
  })

  it("rejects URL-like values for params handled by radar", () => {
    expect(() => normalizeSourceParams(providers["netease-music"].sources.playlist, {
      id: "https://music.163.com/playlist?id=5059661515&uct2=U2FsdGVkX1+h604nouVzL3eBMasVMbAgGM76vxJxHfw=",
    })).toThrowError(SourceServiceError)
  })
})
