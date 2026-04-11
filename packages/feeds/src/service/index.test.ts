import type { RegisteredFeedDefinition } from "../typings"
import { describe, expect, it } from "vitest"
import {
  buildFeedCacheKey,
  FeedServiceError,
  normalizeFeedParams,
  parseFeedId,
} from "./index"

describe("feed service", () => {
  it("parses feed IDs with default feed IDs", () => {
    expect(parseFeedId("rss")).toEqual({
      provider: "rss",
      feed: "default",
    })
  })

  it("throws for invalid feed IDs", () => {
    expect(() => parseFeedId("")).toThrowError(FeedServiceError)
  })

  it("normalizes parameter values using feed parameter definitions", () => {
    const feedDefinition = {
      params: {
        page: { type: "number", default: 1, title: "Page" },
        latest: { type: "switch", default: false, title: "Latest" },
        q: { type: "text", default: "top", title: "Query" },
      },
    } satisfies Pick<RegisteredFeedDefinition, "params">

    expect(normalizeFeedParams(feedDefinition, {
      page: "2",
      latest: "1",
    })).toEqual({
      page: 2,
      latest: true,
      q: "top",
    })
  })

  it("normalizes multiselect values using parameter helpers", () => {
    const feedDefinition = {
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
    } satisfies Pick<RegisteredFeedDefinition, "params">

    expect(normalizeFeedParams(feedDefinition, {
      tags: "tech,world",
    })).toEqual({
      tags: ["tech", "world"],
    })
  })

  it("throws a feed service error for invalid parameter values", () => {
    const feedDefinition = {
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
    } satisfies Pick<RegisteredFeedDefinition, "params">

    expect(() => normalizeFeedParams(feedDefinition, {
      headers: "{invalid-json}",
    })).toThrowError("Request Headers (JSON) must be valid JSON")
  })

  it("parses default values into runtime output types", () => {
    const feedDefinition = {
      params: {
        headers: {
          type: "text",
          default: "{}",
          title: "Request Headers (JSON)",
          parse: value => JSON.parse(String(value)) as Record<string, string>,
        },
      },
    } satisfies Pick<RegisteredFeedDefinition, "params">

    expect(normalizeFeedParams(feedDefinition)).toEqual({
      headers: {},
    })
  })

  it("builds cache keys with normalized params", () => {
    expect(buildFeedCacheKey("json:default", {
      itemsPath: "items",
      page: 2,
    })).toBe("json:default:{\"itemsPath\":\"items\",\"page\":2}")
  })
})
