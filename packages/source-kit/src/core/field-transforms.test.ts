import { describe, expect, it } from "vitest"
import { applyFieldTransforms, validateFieldTransforms } from "./field-transforms"
import { renderTemplate } from "./template"

describe("field transforms", () => {
  it("matches existing text-cleanup pipelines, including malformed markup", () => {
    const transforms = ["strip_html", "normalize_whitespace", { op: "truncate", length: 12, suffix: "…" }] as const
    for (const value of ["<b>Hello</b>\n world and more", "<script>x</script>visible", "<!-- comment -->Hello", "<unclosed", "<script>unclosed <b>text</b>", "<STYLE>x</STYLE>", "", null]) {
      expect(applyFieldTransforms(value, transforms)).toBe(renderTemplate(
        "{{ value | strip_html | normalize_whitespace | truncate: 12, '…' }}",
        { value },
      ))
    }
  })

  it("preserves numeric values and treats missing/invalid timestamps as absent", () => {
    expect(applyFieldTransforms("1704067200", "seconds_to_ms")).toBe(1704067200000)
    expect(applyFieldTransforms("2024-01-01T00:00:00Z", "date_to_ms")).toBe(1704067200000)
    expect(applyFieldTransforms("1.2k", "parse_compact_number")).toBe(1200)
    for (const value of [null, undefined, "", "invalid"]) {
      expect(applyFieldTransforms(value, "seconds_to_ms")).toBeUndefined()
      expect(applyFieldTransforms(value, "date_to_ms")).toBeUndefined()
    }
  })

  it("uses direct regex patterns and retains regex safety limits", () => {
    const step = { op: "regex_extract", pattern: "^.*[>›]\\s*(.+)$", group: 1 } as const
    expect(applyFieldTransforms("V2EX › 分享发现", step)).toBe("分享发现")
    expect(() => validateFieldTransforms({ op: "regex_extract", pattern: "(a+)+$" }, "source.title"))
      .toThrow("source.title")
    expect(() => applyFieldTransforms("a".repeat(20_001), step)).toThrow("cannot exceed")
  })

  it("resolves URLs against the request before deriving a favicon", () => {
    expect(applyFieldTransforms("../article/1", "absolute_url", "https://example.com/news/"))
      .toBe("https://example.com/article/1")
    expect(applyFieldTransforms("../article/1", ["absolute_url", "favicon_url"], "https://example.com/news/"))
      .toBe("https://favicon.im/example.com?larger=true")
  })

  it("validates operations, arguments, and pipeline bounds before rendering", () => {
    for (const value of ["unknown", [], Array.from({ length: 17 }).fill("first_line"), { op: "truncate", length: -1 }, { op: "normalize_lines", spacing: 5 }, { op: "regex_extract", pattern: "x", group: 100 }, { op: "append", value: "x", extra: true }]) {
      expect(() => validateFieldTransforms(value, "source.title")).toThrow("source.title")
    }
    expect(() => validateFieldTransforms(["strip_html", { op: "truncate", length: 100 }], "source.title"))
      .not
      .toThrow()
  })
})
