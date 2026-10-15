import { describe, expect, it } from "vitest"
import { applyFieldTransforms, validateFieldTransforms } from "./field-transforms"

describe("field transforms", () => {
  it("matches existing text-cleanup pipelines, including malformed markup", () => {
    const transforms = ["strip_html", "normalize_whitespace", { op: "truncate", length: 12, suffix: "…" }] as const
    const examples = [
      ["<b>Hello</b>\n world and more", "Hello world…"],
      ["<script>x</script>visible", "visible"],
      ["<!-- comment -->Hello", "Hello"],
      ["<unclosed", "<unclosed"],
      ["<script>unclosed <b>text</b>", "unclosed te…"],
      ["<STYLE>x</STYLE>", "x"],
      ["", ""],
      [null, ""],
    ]
    for (const [value, expected] of examples) {
      expect(applyFieldTransforms(value, transforms)).toBe(expected)
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

  it("parses formatted wall time in its declared timezone", () => {
    const step = { op: "date_to_ms", format: "yyyy年MM月dd日", timezone: "Asia/Shanghai" } as const
    validateFieldTransforms(step, "source.publishedAt")
    expect(applyFieldTransforms("2026年01月02日", step)).toBe(Date.UTC(2026, 0, 1, 16))
    expect(applyFieldTransforms("2026年01月02日", { ...step, timezone: "UTC" })).toBe(Date.UTC(2026, 0, 2))
    for (const value of [undefined, null, "", "2026年02月30日"]) {
      expect(applyFieldTransforms(value, step)).toBeUndefined()
    }
    expect(() => applyFieldTransforms("2026年01月02日", { ...step, timezone: "Mars/Olympus_Mons" })).toThrow("Invalid IANA timezone")
  })

  it("keeps default date parsing independent of the request URL", () => {
    expect(applyFieldTransforms("2026-01-02T12:00:00+08:00", "date_to_ms", "https://example.com/"))
      .toBe(Date.UTC(2026, 0, 2, 4))
    expect(applyFieldTransforms("2026-01-02T12:00:00", { op: "date_to_ms", timezone: "Asia/Shanghai" }))
      .toBe(Date.UTC(2026, 0, 2, 4))
  })

  it("cleans selected text before composing it", () => {
    expect(applyFieldTransforms(" First \n\n Second ", { op: "normalize_lines", spacing: 2 })).toBe("First\n\nSecond")
    expect(applyFieldTransforms("\nTelegram message\nSecond", ["first_line", { op: "truncate", length: 8, suffix: "…" }])).toBe("Telegra…")
    expect(applyFieldTransforms("background-image: url('https://example.com/image.jpg')", "css_url")).toBe("https://example.com/image.jpg")
    expect(applyFieldTransforms("2.5M", "parse_compact_number")).toBe(2500000)
    expect(applyFieldTransforms("OPEN", "lowercase")).toBe("open")
    expect(applyFieldTransforms("abcdef12345", { op: "truncate", length: 7, suffix: "" })).toBe("abcdef1")
  })

  it.each([
    ["1.2万", 12_000],
    ["3千", 3_000],
    ["1.2亿", 120_000_000],
    ["1,234.5K", 1_234_500],
    [" 2.5 M ", 2_500_000],
    ["0", 0],
    ["1.25", 1.25],
    ["12万观看", undefined],
    ["1.2.3万", undefined],
    ["1,23万", undefined],
    ["", undefined],
    [Number.NaN, undefined],
  ])("parses compact numbers (%s)", (value, expected) => {
    expect(applyFieldTransforms(value, "parse_compact_number")).toBe(expected)
  })

  it.each([
    ["😀😃😄😁", 3, "…", "😀😃…"],
    ["😀😃😄", 3, "…", "😀😃😄"],
    ["😀😃😄😁", 2, "😀", "😀😀"],
    ["😀😃😄😁", 2, "", "😀😃"],
    ["abcdef", 2, "...", ".."],
    ["abcdef", 0, "…", ""],
  ])("truncates Unicode text (%s) within the total length", (value, length, suffix, expected) => {
    expect(applyFieldTransforms(value, { op: "truncate", length, suffix })).toBe(expected)
  })

  it("preserves shorter non-string inputs when truncating", () => {
    for (const value of [null, undefined, 12, false]) {
      expect(applyFieldTransforms(value, { op: "truncate", length: 8 })).toBe(value)
    }
  })

  it("reduces timestamp precision without inventing missing dates", () => {
    const step = { op: "timestamp_precision", milliseconds: 60_000 } as const
    expect(applyFieldTransforms(1704067212345, step)).toBe(1704067200000)
    expect(applyFieldTransforms(0, step)).toBe(0)
    for (const value of [undefined, null, "", "invalid"]) expect(applyFieldTransforms(value, step)).toBeUndefined()
    expect(() => validateFieldTransforms({ ...step, milliseconds: 0 }, "source.time")).toThrow("source.time")
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
