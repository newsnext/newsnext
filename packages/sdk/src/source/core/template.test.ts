import { describe, expect, it } from "vitest"
import {
  compileSourceTemplate,
  compileSourceTemplateValue,
  createSourceTemplateScope,
  isTemplate,
} from "./template"

describe("source templates", () => {
  it("renders templates recursively in plain objects and arrays", () => {
    const templates = compileSourceTemplateValue({
      headers: {
        authorization: "Bearer {{ scope.params.token }}",
      },
      tags: ["static", "{{ scope.params.tag }}"],
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
      tags: ["static", "news"],
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
      "{{ scope.params.value }}",
      { location: "test.radar.patch.params.value", slot: "radarParams" },
    )).toThrow("Template path \"scope.params.value\" is not available")
  })

  it("renders missing values as empty text and reports actual render failures", () => {
    const template = compileSourceTemplate(
      "{{ scope.value }}",
      { location: "test.loader.fields.title.template", slot: "field" },
    )

    expect(template.render(createSourceTemplateScope(undefined, {}))).toBe("")
    expect(() => template.render(createSourceTemplateScope(undefined, { value: {} })))
      .toThrow("Failed to render source template at test.loader.fields.title.template")
  })

  it("renders empty text for sparse Radar parameters and honors explicit fallbacks", () => {
    const template = compileSourceTemplate("{{ scope.query.optional }}", { location: "test.radar.patch.params.value", slot: "radarParams" })
    expect(template.render(createSourceTemplateScope(undefined, { query: {} }))).toBe("")
    const fallback = compileSourceTemplate("{{ scope.query.optional ?? 'News' }}", { location: "test.radar.patch.params.value", slot: "radarParams" })
    expect(fallback.render(createSourceTemplateScope(undefined, { query: {} }))).toBe("News")
  })

  it("preserves mixed text with missing inputs and honors explicit fallbacks", () => {
    const template = compileSourceTemplate("By {{ scope.item.author.name }} · {{ scope.item.attributes.topic }}", {
      location: "test.loader.annotation",
      slot: "annotation",
    })
    expect(template.render(createSourceTemplateScope(undefined, { item: { author: { name: "Author" } } }))).toBe("By Author · ")
    expect(template.render(createSourceTemplateScope(undefined, { item: { author: { name: "Author" }, attributes: { topic: "News" } } }))).toBe("By Author · News")
    const fallback = compileSourceTemplate("{{ scope.item.author.name ?? 'Anonymous' }}", { location: "test.loader.annotation", slot: "annotation" })
    expect(fallback.render(createSourceTemplateScope(undefined, { item: {} }))).toBe("Anonymous")
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
    )).toThrow("Invalid source template at test:source.loader.url")
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
        location: "test:source.loader.fields.content.html.template",
        output: "html",
        slot: "field",
      },
    )

    expect(template.render(createSourceTemplateScope(undefined, {
      value: "<em>unsafe</em>",
    })))
      .toBe("<strong>&lt;em&gt;unsafe&lt;/em&gt;</strong>")
  })

  it.each([
    "{% if scope.params.id %}yes{% endif %}",
    "{%- unless scope.params.id -%}yes{%- endunless -%}",
    "{% case scope.params.id %}{% when 1 %}yes{% endcase %}",
    "{% assign value = 1 %}{{ value }}",
    "{% capture value %}yes{% endcapture %}",
    "{% for value in scope.params.values %}{{ value }}{% endfor %}",
    "{% include 'secret' %}",
    "{% raw %}{{ unsafe }}{% endraw %}",
    "{% liquid\ninclude 'secret'\n%}",
  ])("rejects template tags: %s", (template) => {
    expect(() => compileSourceTemplate(template, {
      location: "test.loader.url",
      slot: "request",
    })).toThrow("Invalid source template at test.loader.url: Template tags are not allowed")
  })
})
