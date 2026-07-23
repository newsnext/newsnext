import type { RegisteredSourceDefinition } from "@newsnext/source/typings"
import { describe, expect, it } from "vitest"
import neteaseMusic from "../lib/netease-music"
import weibo from "../lib/weibo"
import x from "../lib/x"
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

  it("rejects URL-like values for params handled by radar", () => {
    expect(() => normalizeSourceParams(neteaseMusic.sources.playlist, {
      id: "https://music.163.com/playlist?id=5059661515&uct2=U2FsdGVkX1+h604nouVzL3eBMasVMbAgGM76vxJxHfw=",
    })).toThrowError(SourceServiceError)

    expect(() => normalizeSourceParams(weibo.sources.user, {
      uid: "https://m.weibo.cn/u/1195230310",
    })).toThrowError(SourceServiceError)

    expect(() => normalizeSourceParams(weibo.sources["super-topic"], {
      id: "https://m.weibo.cn/p/index?containerid=1008084989d223732bf6f02f75ea30efad58a9_-_feed",
    })).toThrowError(SourceServiceError)

    expect(() => normalizeSourceParams(x.sources.user, {
      username: "https://x.com/newsnext_dev",
    })).toThrowError(SourceServiceError)
  })
})
