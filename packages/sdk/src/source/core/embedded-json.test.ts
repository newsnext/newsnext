import { describe, expect, it } from "vitest"
import { parseEmbeddedJson } from "./embedded-json"

describe("parseEmbeddedJson", () => {
  it("parses nested JSON and preserves literal script text", () => {
    const value = { text: "中文 &quot; <b>title</b>", items: [{ createdAt: "2026-10-09T11:42:37Z" }] }
    expect(parseEmbeddedJson(
      `<html><script id="data" type="application/json">${JSON.stringify(value)}</script></html>`,
      { select: "script#data" },
    )).toEqual(value)
  })

  it("reads decoded JSON attributes and selects the first matching element", () => {
    expect(parseEmbeddedJson(
      "<div data-json=\"{&quot;value&quot;:42}\"></div><div data-json=\"invalid\"></div>",
      { select: "[data-json]", attr: "data-json" },
    )).toEqual({ value: 42 })
  })

  it("handles large data and arbitrary JSON root values", () => {
    const value = { padding: "x".repeat(500_000), items: [{ id: 1 }] }
    expect(parseEmbeddedJson(`<script>${JSON.stringify(value)}</script>`, { select: "script" })).toEqual(value)
    for (const root of [null, 42, "text", [1, 2]]) {
      expect(parseEmbeddedJson(`<script>${JSON.stringify(root)}</script>`, { select: "script" })).toEqual(root)
    }
  })

  it("reports missing, empty, or invalid data without evaluating JavaScript", () => {
    expect(() => parseEmbeddedJson("", { select: " " })).toThrow("requires a CSS selector")
    expect(() => parseEmbeddedJson("<div></div>", { select: "script" })).toThrow("element not found")
    expect(() => parseEmbeddedJson("<script> </script>", { select: "script" })).toThrow("content is empty")
    expect(() => parseEmbeddedJson("<div></div>", { select: "div", attr: "data-json" })).toThrow("content is empty")
    expect(() => parseEmbeddedJson("<script>window.state = {\"value\":1}</script>", { select: "script" }))
      .toThrow("Invalid embedded JSON")
  })
})
