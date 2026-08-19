import type { SourceParamSchemaMap } from "../types"
import { describe, expect, it } from "vitest"
import {
  parseSourceParamValue,
  validateSourceParamDefinitions,
  validateSourceParamPatch,
  validateSourceParamValue,
} from "./params"

const params = {
  id: {
    type: "text",
    title: "ID",
    default: "42",
    required: true,
    validate: { format: "digits" },
  },
  page: {
    type: "number",
    title: "Page",
    default: 1,
    min: 1,
    max: 10,
  },
} as const satisfies SourceParamSchemaMap

describe("source parameter validation", () => {
  it("normalizes and validates one value through the shared API", () => {
    expect(validateSourceParamValue(params.id, " 123 ")).toEqual({
      valid: true,
      value: "123",
    })
    expect(validateSourceParamValue(params.id, "abc")).toEqual({
      valid: false,
      error: "Invalid value for 'ID': expected digits",
    })
  })

  it("validates and normalizes an explicit sparse parameter patch", () => {
    expect(validateSourceParamPatch(params, {
      id: " 123 ",
      unknown: "ignored",
    })).toEqual({
      valid: true,
      errors: {},
      values: { id: "123" },
    })

    expect(validateSourceParamPatch(params, {
      id: "invalid",
      page: 20,
    })).toEqual({
      valid: false,
      errors: {
        id: "Invalid value for 'ID': expected digits",
        page: "Invalid value for 'Page': expected a number <= 10",
      },
    })

    expect(validateSourceParamPatch(params, {
      id: undefined,
      ignored: null,
      page: "2",
    })).toEqual({
      valid: true,
      errors: {},
      values: { page: 2 },
    })
    expect(parseSourceParamValue(params.id, null)).toBe("42")
  })

  it("supports optional empty values and bounded regex validation", () => {
    const optionalId = {
      ...params.id,
      default: "",
      required: false,
    } as const
    const topicId = {
      type: "text",
      title: "Topic ID",
      default: "100808abc",
      validate: { regex: "^100808[A-Za-z0-9]+$" },
    } as const

    expect(parseSourceParamValue(optionalId, "")).toBe("")
    expect(validateSourceParamValue(topicId, "100808xyz").valid).toBe(true)
    expect(validateSourceParamValue(topicId, "xyz").valid).toBe(false)
    expect(validateSourceParamValue(topicId, "a".repeat(20_001))).toEqual({
      valid: false,
      error: "Invalid value for 'Topic ID'",
    })
  })

  it("supports required trimmed text without a duplicate regex", () => {
    const keyword = {
      type: "text",
      title: "Keyword",
      default: "news",
      required: true,
    } as const

    expect(parseSourceParamValue(keyword, "  radar  ")).toBe("radar")
    expect(validateSourceParamValue(keyword, "   ")).toEqual({
      valid: false,
      error: "Invalid value for 'Keyword': expected a non-empty value",
    })
  })

  it("strictly validates URL and switch inputs", () => {
    const url = {
      type: "url",
      title: "Feed URL",
      default: "https://example.com/feed.xml",
    } as const
    const enabled = {
      type: "switch",
      title: "Enabled",
      default: false,
    } as const

    expect(validateSourceParamValue(url, "https://news.example/feed").valid).toBe(true)
    expect(validateSourceParamValue(url, "javascript:alert(1)").valid).toBe(false)
    expect(parseSourceParamValue(enabled, "0")).toBe(false)
    expect(validateSourceParamValue(enabled, "yes").valid).toBe(false)
  })

  it("validates parameter definitions before runtime", () => {
    expect(() => validateSourceParamDefinitions({
      id: {
        ...params.id,
        validate: { regex: "^(a+)+$" },
      },
    }, "source.params")).toThrow("source.params.id.validate.regex is invalid")
    expect(() => validateSourceParamDefinitions({
      id: {
        ...params.id,
        required: "yes",
      },
    }, "source.params")).toThrow("source.params.id.required must be a boolean")
  })
})
