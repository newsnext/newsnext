import { describe, expect, it } from "vitest"
import {
  compileSourceTemplate,
  compileSourceTemplateValue,
  createSourceTemplateScope,
  isTemplate,
  renderHtmlTemplate,
  renderTemplate,
} from "./template"

describe("source templates", () => {
  it("renders plain text without HTML escaping", () => {
    expect(renderTemplate(
      "https://example.com/{{ topic }}?tag={{ tag }}",
      { topic: "news", tag: "a&b" },
    )).toBe("https://example.com/news?tag=a&b")
  })

  it("provides source-oriented Liquid filters", () => {
    expect(renderTemplate(
      "{{ value | normalize_whitespace }}",
      { value: "  Hello \n world  " },
    )).toBe("Hello world")

    expect(renderTemplate(
      "{{ value | normalize_lines: 2 }}",
      { value: " First \n\n Second " },
    )).toBe("First\n\nSecond")

    expect(renderTemplate(
      "{{ value | first_line | truncate: 8, '…' }}",
      { value: "\nTelegram message\nSecond" },
    )).toBe("Telegra…")

    expect(renderTemplate(
      "{{ value | absolute_url: requestUrl }}",
      {
        requestUrl: "https://example.com/news/",
        value: "../article/1",
      },
    )).toBe("https://example.com/article/1")

    expect(renderTemplate(
      "{{ value | css_url }}",
      { value: "background-image: url('https://example.com/image.jpg')" },
    )).toBe("https://example.com/image.jpg")

    expect(renderTemplate(
      "{{ value | date_to_ms }}",
      { value: "2024-01-01T00:00:00Z" },
    )).toBe("1704067200000")

    expect(renderTemplate(
      "{{ value | absolute_url: requestUrl | favicon_url }}",
      {
        requestUrl: "https://news.ycombinator.com/",
        value: "https://example.com/article",
      },
    )).toBe("https://icons.folo.is/example.com")

    expect(renderTemplate(
      "{{ value | regex_replace: '\\\\s*[–-]\\\\s*Telegram$', '' }}",
      { value: "News – Telegram" },
    )).toBe("News")

    expect(renderTemplate(
      "{{ value | regex_extract: '^.*[>›]\\\\s*(.+)$', 1 }}",
      { value: "V2EX › 分享发现" },
    )).toBe("分享发现")
  })

  it("allows source-oriented filters to receive null values", () => {
    expect(renderTemplate("{{ value | css_url }}", { value: null })).toBe("")
    expect(renderTemplate("{{ value | date_to_ms }}", { value: null })).toBe("")
  })

  it("supports conditions and URL encoding helpers", () => {
    expect(renderTemplate(
      "{% assign normalized = language | strip %}/trending{% if normalized %}/{{ normalized | url_path }}{% endif %}",
      { language: " c++ " },
    )).toBe("/trending/c%2B%2B")

    expect(renderTemplate(
      "/{{ item.path | url_path }}?query={{ item.query | url_query }}",
      { item: { path: "a/b", query: "a&b" } },
    )).toBe("/a%2Fb?query=a%26b")
  })

  it("renders templates recursively in plain objects and arrays", () => {
    const templates = compileSourceTemplateValue({
      headers: {
        authorization: "Bearer {{ scope.params.token }}",
      },
      tags: ["static", "{{ scope.params.tag | upcase }}"],
    }, {
      location: "test.loader.fetchOptions",
      slot: "request",
    })

    expect(templates.render(createSourceTemplateScope(undefined, {
      params: { tag: "news", token: "secret" },
    }))).toEqual({
      headers: {
        authorization: "Bearer secret",
      },
      tags: ["static", "NEWS"],
    })
  })

  it("binds shared source templates to their source locations", () => {
    const first = compileSourceTemplate(
      "{{ source.vars.origin }}/{{ scope.params.path }}",
      { location: "first.loader.url", slot: "request" },
    )
    const second = compileSourceTemplate(
      "{{ source.vars.origin }}/{{ scope.params.path }}",
      { location: "second.loader.url", slot: "request" },
    )
    const repeated = compileSourceTemplate(
      "{{ source.vars.origin }}/{{ scope.params.path }}",
      { location: "first.loader.url", slot: "request" },
    )

    expect(first).not.toBe(second)
    expect(repeated).toBe(first)
    expect(first.location).toBe("first.loader.url")
    expect(second.location).toBe("second.loader.url")
    expect(first.render(createSourceTemplateScope(
      { origin: "https://example.com" },
      {
        params: { path: "news" },
      },
    ))).toBe("https://example.com/news")
  })

  it("validates paths against the source template slot", () => {
    expect(() => compileSourceTemplate(
      "{{ params.value }}",
      { location: "test.params.value.template", slot: "param" },
    )).toThrow("Template path \"params.value\" is not available")
  })

  it("reports source locations for runtime render failures", () => {
    const template = compileSourceTemplate(
      "{{ scope.value | required }}",
      { location: "test.loader.fields.title.template", slot: "field" },
    )

    expect(() => template.render(createSourceTemplateScope(undefined, { value: "" })))
      .toThrow("Failed to render Liquid template at test.loader.fields.title.template")
  })

  it("escapes inserted values in HTML templates", () => {
    expect(renderHtmlTemplate(
      "<strong>{{ item.title }}</strong>",
      { item: { title: "<script>alert(1)</script>" } },
    )).toBe("<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>")
  })

  it("rejects the raw filter in HTML templates", () => {
    expect(() => renderHtmlTemplate(
      "<strong>{{ item.title | raw }}</strong>",
      { item: { title: "<em>unsafe</em>" } },
    )).toThrow("The raw filter is not allowed")
  })

  it("only identifies strings containing template expressions", () => {
    expect(isTemplate("item.title")).toBe(false)
    expect(isTemplate("{{ item.title }}")).toBe(true)
    expect(isTemplate("{% if item %}yes{% endif %}")).toBe(true)
  })

  it("keeps static slot values literal", () => {
    const template = compileSourceTemplate(
      "Literal | raw",
      { location: "test.loader.url", slot: "request" },
    )

    expect(template.render({})).toBe("Literal | raw")
  })

  it("reports invalid templates with their source location", () => {
    expect(() => compileSourceTemplate(
      "{{ scope.params.id | unknown_filter }}",
      { location: "test:source.loader.url", slot: "request" },
    )).toThrow("Invalid Liquid template at test:source.loader.url")
  })

  it("validates available template paths", () => {
    expect(() => compileSourceTemplate(
      "{{ item.id }}",
      { location: "test:source.loader.url", slot: "request" },
    )).toThrow("Template path \"item.id\" is not available")
  })

  it("uses the schema-provided output mode for HTML templates", () => {
    const template = compileSourceTemplate(
      "<strong>{{ scope.value }}</strong>",
      {
        location: "test:source.loader.fields.preview.html.template",
        output: "html",
        slot: "field",
      },
    )

    expect(template.render(createSourceTemplateScope(undefined, {
      value: "<em>unsafe</em>",
    })))
      .toBe("<strong>&lt;em&gt;unsafe&lt;/em&gt;</strong>")
  })

  it("rejects file-backed and raw tags", () => {
    expect(() => renderTemplate("{% include 'secret' %}", {})).toThrow(
      "File inclusion, layouts, and raw blocks are not allowed",
    )
    expect(() => renderTemplate("{% raw %}{{ unsafe }}{% endraw %}", {})).toThrow(
      "File inclusion, layouts, and raw blocks are not allowed",
    )
    expect(() => renderTemplate("{% liquid\ninclude 'secret'\n%}", {})).toThrow(
      "File inclusion, layouts, and raw blocks are not allowed",
    )
  })

  it("bounds regular expression filters", () => {
    expect(() => renderTemplate(
      "{{ value | regex_extract: '(a+)+$' }}",
      { value: "a".repeat(100) },
    )).toThrow("Nested quantified groups are not allowed")

    expect(() => renderTemplate(
      "{{ value | regex_replace: pattern, '' }}",
      { pattern: "a".repeat(501), value: "a" },
    )).toThrow("cannot exceed 500 characters")
  })
})
