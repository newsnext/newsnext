import { describe, expect, it } from "vitest"
import { compileInterpolation } from "./interpolation"

describe("bounded interpolation", () => {
  it("renders plain text without HTML escaping", () => {
    expect(compileInterpolation(
      "https://example.com/{{ topic }}?tag={{ tag }}",
    ).render({ topic: "news", tag: "a&b" })).toBe("https://example.com/news?tag=a&b")
  })

  it("supports URL encoding helpers", () => {
    expect(compileInterpolation(
      "/{{ item.path | url_path }}?query={{ item.query | url_query }}",
    ).render({ item: { path: "a/b", query: "a&b" } })).toBe("/a%2Fb?query=a%26b")
  })

  it("escapes inserted values in HTML templates", () => {
    expect(compileInterpolation(
      "<strong>{{ item.title }}</strong>",
      true,
    ).render({ item: { title: "<script>alert(1)</script>" } })).toBe("<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>")
  })

  it("rejects the raw filter in HTML templates", () => {
    expect(() => compileInterpolation(
      "<strong>{{ item.title | raw }}</strong>",
      true,
    )).toThrow("The raw filter is not allowed")
  })

  it("looks up nested dictionaries and arrays without evaluating code", () => {
    const render = compileInterpolation("{{ source.vars.labels[scope.params.period][scope.params.market] }}: {{ scope.item.names[0] }}", false, ["source.vars", "scope.params", "scope.item"]).render
    expect(render({ source: { vars: { labels: { day: { cn: "China" } } } }, scope: { params: { period: "day", market: "cn" }, item: { names: ["News"] } } })).toBe("China: News")
  })

  it("keeps delimiters inside quoted strings and handles string escapes", () => {
    expect(compileInterpolation("{{ value ?? 'a | b: }}' }}").render({})).toBe("a | b: }}")
    expect(compileInterpolation("{{ 'it\\'s\\nnews' }}").render({})).toBe("it's\nnews")
    expect(compileInterpolation("{{ map['a-b'] }}").render({ map: { "a-b": "News" } })).toBe("News")
    expect(compileInterpolation("{{ '1983553349228987887' }}").renderValue({})).toBe("1983553349228987887")
    expect(() => compileInterpolation("{{ 1983553349228987887 }}")).toThrow("quote opaque IDs")
  })

  it("uses nullish fallbacks lazily and preserves empty text, false, and zero", () => {
    const render = compileInterpolation("{{ value ?? fallback ?? 'empty' }}").render
    for (const value of [undefined, null]) expect(render({ value, fallback: "News" })).toBe("News")
    expect(render({ value: "" })).toBe("")
    expect(render({ value: "News", get fallback() {
      throw new Error("Unused fallback")
    } })).toBe("News")
    expect(compileInterpolation("{{ value ?? null }}").renderValue({})).toBeNull()
    expect(compileInterpolation("{{ value ?? fallback | url_query }}").render({ fallback: "a&b" })).toBe("a%26b")
    expect(render({ value: 0 })).toBe("0")
    expect(render({ value: true })).toBe("true")
    expect(render({ value: false })).toBe("false")
    expect(() => render({ value: [] })).toThrow("output must be")
    expect(render({})).toBe("empty")
    expect(compileInterpolation("{{ value }}").render({ value: null })).toBe("")
    expect(compileInterpolation("{{ value }}").render({})).toBe("")
  })

  it("reports complete paths and expression offsets without exposing computed keys", () => {
    const program = compileInterpolation("Title: {{ scope.item.author.name }}")
    expect(program.render({ scope: { item: {} } })).toBe("Title: ")
    expect(() => program.render({ scope: { item: { author: { name: {} } } } }))
      .toThrow("in {{ scope.item.author.name }} at offset 7")
    try {
      compileInterpolation("{{ labels[key] }}").render({ labels: { "private-token": {} }, key: "private-token" })
      expect.fail("Expected output type error")
    } catch (error) {
      expect(String(error)).toContain("{{ labels[key] }}")
      expect(String(error)).not.toContain("private-token")
    }
  })

  it("uses truthy fallbacks lazily and returns the final operand unchanged", () => {
    const program = compileInterpolation("{{ value || fallback || 'empty' }}")
    for (const value of [undefined, null, "", false, 0, NaN]) {
      expect(program.render({ value, fallback: "News" })).toBe("News")
      expect(program.render({ value, fallback: false })).toBe("empty")
    }
    expect(program.render({ value: "News", get fallback() {
      throw new Error("Unused fallback")
    } })).toBe("News")
    for (const value of [[], {}, true, 1, "0"]) expect(program.renderValue({ value })).toBe(value)
    for (const value of ["", false, 0, null]) {
      expect(compileInterpolation("{{ missing || value }}").renderValue({ value })).toBe(value)
    }
    expect(compileInterpolation("{{ missing || absent }}").render({})).toBe("")
    expect(compileInterpolation("{{ value||'a&b' | url_query }}").render({ value: "" })).toBe("a%26b")
    expect(compileInterpolation("{{ value || '<b>' }}", true).render({})).toBe("&lt;b&gt;")
    expect(compileInterpolation("{{ value || 'a || b ?? c' }}").render({})).toBe("a || b ?? c")
    expect(() => compileInterpolation("{{ scope.params.value || scope.item.value }}", false, ["scope.params"]))
      .toThrow("not available")
  })

  it.each(["{{ a ?? b || c }}", "{{ a || b ?? c }}"])("rejects mixed fallback operators: %s", (template) => {
    expect(() => compileInterpolation(template)).toThrow("Cannot mix ?? and ||")
  })

  it("renders missing insertions as empty text while preserving falsy values", () => {
    const program = compileInterpolation("{{ author }} · {{ count }}")
    expect(program.render({ count: 0 })).toBe(" · 0")
    expect(program.render({ author: "News", count: null })).toBe("News · ")
    expect(program.render({ author: "", count: false })).toBe(" · false")
    expect(program.render({ author: "News", count: 0 })).toBe("News · 0")
    expect(compileInterpolation("{{ labels[key] }}").render({ labels: {} })).toBe("")
    expect(compileInterpolation("{{ value }}").renderValue({})).toBeUndefined()
  })

  it("escapes only interpolated HTML and keeps plain request values literal", () => {
    const template = "<b>{{ value }}</b>"
    expect(compileInterpolation(template, true).render({ value: "<&\"'" })).toBe("<b>&lt;&amp;&quot;&apos;</b>")
    expect(compileInterpolation(template).render({ value: "<&" })).toBe("<b><&</b>")
    expect(compileInterpolation("{{ value | url_query }}").render({ value: "a&b /中" })).toBe("a%26b%20%2F%E4%B8%AD")
  })

  it("validates dynamic keys and filter arguments against the slot", () => {
    for (const template of ["{{ source.vars.map[scope.item.id] }}", "{{ scope.params.id ?? scope.item.id }}", "{{ scope }}", "{{ source }}", "{{ scope[scope.params.key] }}", "{{ scope['params.secret'] }}"]) {
      expect(() => compileInterpolation(template, false, ["scope.params", "source.vars"])).toThrow("not available")
    }
  })

  it("rejects inherited and forbidden properties, including computed keys", () => {
    expect(compileInterpolation("{{ item.name }}").render({ item: Object.create({ name: "News" }) })).toBe("")
    for (const key of ["__proto__", "constructor", "prototype"]) {
      expect(() => compileInterpolation(`{{ item.${key} }}`)).toThrow("not allowed")
      expect(() => compileInterpolation(`{{ item['${key}'] }}`)).toThrow("not allowed")
      expect(() => compileInterpolation("{{ item[key] ?? '' }}").render({ item: {}, key })).toThrow("not allowed")
    }
    expect(() => compileInterpolation("{{ item }}").render({ item: {} })).toThrow("output must be")
  })

  it.each(["{{ value", "{{ }}", "{{ value() }}", "{{ value + 1 }}", "{{ value | upcase }}", "{{ value | default }}", "{{ value | default: 'old' }}", "{{ value ?? }}", "{{ value || }}", "{{ value ||| fallback }}", "{{ value | url_path | url_query }}", "{{ value | url_query ?? fallback }}", "{{ value | url_query || fallback }}", "{{ value | url_path: 'x' }}", "{{ value ?? 1, 2 }}", "{{ value[ }}", "{{ 'unterminated }}", "{{- value -}}", "{{{ value }}}", "{% if value %}yes{% endif %}"])("rejects malformed or unsupported syntax: %s", (template) => {
    expect(() => compileInterpolation(template)).toThrow()
  })

  it("bounds template size, nesting, and expanded output", () => {
    expect(() => compileInterpolation("x".repeat(10_001))).toThrow("10000")
    expect(() => compileInterpolation(`{{ value${".key".repeat(17)} }}`)).toThrow("16")
    expect(() => compileInterpolation(`{{ ${"value[".repeat(18)}'key'${"]".repeat(18)} }}`)).toThrow("16")
    expect(() => compileInterpolation("{{ value }}{{ value }}").render({ value: "x".repeat(50_001) })).toThrow("100000")
  })
})
