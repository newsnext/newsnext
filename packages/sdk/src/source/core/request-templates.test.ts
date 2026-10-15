import { describe, expect, it } from "vitest"
import { compileSourceFetchOptions, compileSourceRequest } from "./request-templates"
import { createSourceTemplateScope } from "./template"

describe("source request templates", () => {
  it("resolves request URLs once per scope while capability inference only reads the URL", () => {
    const request = compileSourceRequest({
      url: "/search/{{ scope.params.category | url_path }}",
      query: { q: "{{ scope.params.q }}", optional: "{{ scope.params.optional }}", enabled: false, count: 0 },
      fetchOptions: { json: { q: "{{ scope.params.q }}" } },
    }, "test.loader")
    const initialScope = createSourceTemplateScope(undefined, { params: { category: "news" } })
    expect(request.renderUrl(initialScope, "https://example.com/")).toBe("https://example.com/search/news")
    expect(request.renderRequestUrl(initialScope, "https://example.com/")).toBe("https://example.com/search/news?enabled=false&count=0")
    const scope = createSourceTemplateScope(undefined, { params: { category: "a/b", q: "A&B 中文" } })
    const url = new URL(request.renderRequestUrl(scope, "https://example.com/"))
    expect(url.pathname).toBe("/search/a%2Fb")
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "A&B 中文", enabled: "false", count: "0" })
    const first = request.renderFetchOptions(scope)
    expect(first).toEqual({ json: { q: "A&B 中文" } })
    if (first) first.json = null
    expect(request.renderFetchOptions(scope)).toEqual({ json: { q: "A&B 中文" } })
    const secondScope = createSourceTemplateScope(undefined, { params: { category: "other", q: "next" } })
    expect(request.renderFetchOptions(secondScope)).toEqual({ json: { q: "next" } })
  })

  it("preserves JSON types while keeping headers and mixed text as strings", () => {
    const options = compileSourceFetchOptions({
      method: "POST",
      headers: { "x-count": "{{ scope.params.count }}", "x-enabled": "{{ scope.params.enabled }}" },
      json: {
        count: "{{ scope.params.count }}",
        enabled: "{{ scope.params.enabled ?? true }}",
        absent: "{{ scope.params.absent ?? null }}",
        empty: "{{ scope.params.empty }}",
        id: "{{ scope.params.id }}",
        label: "Count: {{ scope.params.count }}",
        padded: " {{ scope.params.count }} ",
        encoded: "{{ scope.params.count | url_query }}",
        payload: "{{ source.vars.payload }}",
        items: ["{{ scope.params.enabled }}", "{{ scope.params.count }}"],
      },
    }, "test.loader.fetchOptions")
    const payload = { tags: ["News"], deleted: null, text: "{{ scope.params.secret }}" }
    const scope = createSourceTemplateScope({ payload }, { params: { count: 0, enabled: false, empty: "", id: "1983553349228987887" } })
    const result = options.render(scope)
    expect(result).toEqual({
      method: "POST",
      headers: { "x-count": "0", "x-enabled": "false" },
      json: { count: 0, enabled: false, absent: null, empty: "", id: "1983553349228987887", label: "Count: 0", padded: " 0 ", encoded: "0", payload, items: [false, 0] },
    })
  })

  it("validates missing JSON values at the request boundary with their field location", () => {
    const options = compileSourceFetchOptions({ json: { nested: { id: "{{ scope.params.id }}" } } }, "test.loader.fetchOptions")
    expect(() => options.render(createSourceTemplateScope(undefined, { params: {} })))
      .toThrow("test.loader.fetchOptions.json.nested.id: JSON request value is missing")
  })

  it("rejects empty request URLs and renders missing request text as empty strings", () => {
    const scope = createSourceTemplateScope(undefined, { params: {} })
    for (const url of ["{{ scope.params.url }}", " "]) {
      const request = compileSourceRequest({ url }, "test.loader")
      expect(() => request.renderUrl(scope, "https://example.com/"))
        .toThrow("test.loader.url: Request URL is missing")
    }
    const headers = compileSourceFetchOptions({ headers: { authorization: "Bearer {{ scope.params.token }}" } }, "test.loader.fetchOptions")
    expect(headers.render(scope)).toEqual({ headers: { authorization: "Bearer " } })
    const body = compileSourceFetchOptions({ body: "{{ scope.params.body }}" }, "test.loader.fetchOptions")
    expect(body.render(scope)).toEqual({ body: "" })
    expect(body.render(createSourceTemplateScope(undefined, { params: { body: "" } })))
      .toEqual({ body: "" })
  })

  it("rejects values JSON.stringify would silently discard or coerce", () => {
    for (const invalid of [undefined, NaN, Infinity, () => "News", new Date(), 1n]) {
      const options = compileSourceFetchOptions({ json: { value: "{{ scope.params.value }}" } }, "test.loader.fetchOptions")
      expect(() => options.render(createSourceTemplateScope(undefined, { params: { value: invalid } }))).toThrow()
    }
    expect(() => compileSourceFetchOptions({ json: { value: undefined } }, "test.loader.fetchOptions")).toThrow("Invalid source template")
  })

  it("bounds static and interpolated JSON nesting, size, and cycles", () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(() => compileSourceFetchOptions({ json: cyclic }, "test.loader.fetchOptions")).toThrow("limits")
    const options = compileSourceFetchOptions({ json: "{{ source.vars.payload }}" }, "test.loader.fetchOptions")
    for (const payload of [cyclic, Array.from({ length: 10_001 }).fill(0), "x".repeat(100_001), Array.from({ length: 100 }, () => "x".repeat(1001))]) {
      expect(() => options.render({ source: { vars: { payload } } })).toThrow()
    }
  })
})
