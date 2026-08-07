import type { SourceParamSchema } from "@newsnext/source/types"
import { describe, expect, it } from "vitest"
import { sanitizeSourceParamPatch } from "./params"

const params = {
  topic: {
    type: "text",
    title: "Topic",
    default: "technology",
  },
  page: {
    type: "number",
    title: "Page",
    default: 1,
  },
} satisfies Record<string, SourceParamSchema>

describe("sanitizeSourceParamPatch", () => {
  it("preserves only explicitly supplied known parameters", () => {
    expect(sanitizeSourceParamPatch({
      topic: "science",
      unknown: "value",
    }, params)).toEqual({
      topic: "science",
    })
  })

  it("preserves an explicit value that matches the default", () => {
    expect(sanitizeSourceParamPatch({
      topic: "technology",
    }, params)).toEqual({
      topic: "technology",
    })
  })

  it("does not materialize defaults for a missing patch", () => {
    expect(sanitizeSourceParamPatch(undefined, params)).toEqual({})
  })
})
