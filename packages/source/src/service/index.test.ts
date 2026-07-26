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
      q: " top ",
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

    expect(normalizeSourceParams(sourceDefinition, {
      tags: [" tech ", "world "],
    })).toEqual({
      tags: ["tech", "world"],
    })
  })

  it("applies Liquid parameter templates before validation", () => {
    expect(normalizeSourceParams(providers.telegram.sources.channel, {
      channel: "  @TestFlightCN  ",
    })).toEqual({
      channel: "TestFlightCN",
    })
  })

  it("rejects URL-like values for params handled by radar", () => {
    expect(() => normalizeSourceParams(providers["netease-music"].sources.playlist, {
      id: "https://music.163.com/playlist?id=5059661515&uct2=U2FsdGVkX1+h604nouVzL3eBMasVMbAgGM76vxJxHfw=",
    })).toThrowError(SourceServiceError)
  })
})
