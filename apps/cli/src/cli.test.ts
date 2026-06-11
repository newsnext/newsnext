import { describe, expect, it } from "vitest"
import { parseCliArgs, renderSourceTable } from "./cli"

describe("newsnext cli", () => {
  it("parses fetch params and flags", () => {
    expect(parseCliArgs([
      "fetch",
      "hackernews:newest",
      "--param",
      "page=2",
      "-p",
      "limit=10",
      "--json",
    ])).toEqual({
      command: "fetch",
      sourceId: "hackernews:newest",
      format: "json",
      params: {
        page: "2",
        limit: "10",
      },
    })
  })

  it("defaults sources to the list command", () => {
    expect(parseCliArgs(["sources"])).toMatchObject({
      command: "sources",
      format: "table",
      params: {},
    })
  })

  it("renders source descriptors with provider-qualified ids", () => {
    expect(renderSourceTable([
      {
        key: "default",
        provider: "hackernews",
        providerTitle: "Hacker News",
        title: "Hottest",
        color: "orange",
        category: "others",
      },
    ])).toContain("hackernews:default")
  })
})
