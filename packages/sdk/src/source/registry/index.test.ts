import type { SourceRadarRule, SourceRequestRule } from "../../models/index.js"
import type { SourceLoaderContext } from "../types"
import type { SourceConfig } from "./index"
import { describe, expect, it } from "vitest"
import { createSourceFetch } from "../utils/request/fetch"
import { resolveProvider } from "./index"

function createLoaderContext(): SourceLoaderContext {
  const signal = new AbortController().signal
  return {
    fetch: createSourceFetch(signal),
    signal,
  }
}

function requireSource<T>(source: T | undefined, id: string): T {
  if (source === undefined) {
    throw new Error(`Expected resolved source: ${id}`)
  }
  return source
}

function createSourceConfig(radar: NonNullable<SourceConfig["radar"]>): SourceConfig {
  return {
    metadata: {
      title: "Test",
    },
    radar,
    loader: {
      type: "json",
      url: "https://example.com/items",
      fields: {
        title: "title",
        url: "url",
      },
    },
  }
}

function resolveTestSource(config: SourceConfig): void {
  resolveProvider("test", {
    title: "Test",
    category: "social",
    icon: "provider-icon",
    color: "blue",
    sources: { test: config },
  })
}

describe("source template vars", () => {
  it("inherits a base URL and resolves relative source URLs", async () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      color: "blue",
      defaults: {
        baseUrl: "https://example.com/",
        capabilities: {
          network: [],
        },
      },
      sources: {
        latest: {
          metadata: {
            badge: "/badge.png",
            home: "/latest",
          },
          loader: {
            type: "custom",
            load: async () => ({
              items: [{
                title: "Item",
                url: "/items/1",
              }],
            }),
          },
        },
      },
    })
    const latest = requireSource(provider.sources.latest, "latest")

    expect(latest).toMatchObject({
      baseUrl: "https://example.com/",
      metadata: {
        badge: "https://example.com/badge.png",
        home: "https://example.com/latest",
      },
    })
    await expect(latest.loader({}, createLoaderContext())).resolves.toEqual({
      items: [{
        title: "Item",
        url: "https://example.com/items/1",
      }],
    })
  })

  it("validates loader output before resolving relative URLs", async () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      color: "blue",
      defaults: {
        baseUrl: "https://example.com/",
        capabilities: { network: [] },
      },
      sources: {
        latest: {
          loader: {
            type: "custom",
            load: async () => ({ items: [{ title: "Item", url: "" }] }),
          },
        },
      },
    })
    const latest = requireSource(provider.sources.latest, "latest")

    await expect(latest.loader({}, createLoaderContext())).rejects.toThrow(
      "items[0].url must be a non-empty string",
    )
  })

  it("infers structured loader capabilities from a relative request URL", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      color: "blue",
      defaults: {
        baseUrl: "https://api.example.com/v1/",
      },
      sources: {
        latest: {
          loader: {
            type: "json",
            url: "items",
            fields: {
              title: "title",
              url: "url",
            },
          },
        },
      },
    })

    const latest = requireSource(provider.sources.latest, "latest")
    expect(latest.capabilities.network).toEqual(["api.example.com"])
  })

  it("preserves provider icon data URLs during expansion", () => {
    const icon = "data:image/svg+xml,%3Csvg%2F%3E"
    const provider = resolveProvider("test", {
      title: "Provider",
      icon,
      color: "blue",
      sources: {
        test: {
          loader: {
            type: "custom",
            load: async () => ({ items: [] }),
          },
        },
      },
    })

    const source = requireSource(provider.sources.test, "test")
    expect(source.provider.icon).toBe(icon)
  })

  it("assigns provider source defaults before resolving sources", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      icon: "https://icons.folo.is/example.com",
      color: "blue",
      defaults: {
        capabilities: {
          network: ["api.example.com"],
          cookies: ["account.example.com"],
        },
        metadata: {
          home: "https://example.com",
        },
        radar: [
          {
            id: "default",
            match: { hosts: ["example.com"] },
          },
        ],
      },
      sources: {
        inherited: {
          loader: {
            type: "custom",
            load: async () => ({ items: [] }),
          },
        },
        overridden: {
          metadata: {
            title: "Override",
          },
          radar: [],
          loader: {
            type: "custom",
            load: async () => ({ items: [] }),
          },
          capabilities: {
            network: ["override.example.com"],
          },
        },
      },
    })

    expect(provider.sources.inherited).toMatchObject({
      version: 2,
      capabilities: {
        network: ["api.example.com"],
        cookies: ["account.example.com"],
      },
      metadata: {
        home: "https://example.com",
      },
      provider: {
        icon: "https://icons.folo.is/example.com",
        color: "blue",
      },
      radar: [
        {
          id: "default",
        },
      ],
    })
    expect(provider.sources.overridden).toMatchObject({
      version: 2,
      capabilities: {
        network: ["override.example.com"],
        cookies: ["account.example.com"],
      },
      metadata: {
        home: "https://example.com",
        title: "Override",
      },
      provider: {
        icon: "https://icons.folo.is/example.com",
        color: "blue",
      },
      radar: [],
    })
  })

  it("resolves source metadata from the metadata object", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      icon: "https://icons.folo.is/example.com",
      color: "blue",
      sources: {
        test: {
          metadata: {
            title: "Source",
            home: "https://example.com/source",
          },
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })

    expect(provider.sources.test).toMatchObject({
      metadata: {
        title: "Source",
        home: "https://example.com/source",
      },
      provider: {
        icon: "https://icons.folo.is/example.com",
        color: "blue",
      },
    })
  })

  it("inherits provider default secrets into capabilities", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      defaults: {
        secrets: [
          {
            key: "shared",
            type: "cookie",
            origin: "https://account.example.com",
            itemKey: "shared",
          },
        ],
      },
      sources: {
        test: {
          loader: {
            type: "custom",
            load: async () => ({ items: [] }),
          },
          capabilities: {
            network: [],
          },
        },
      },
    })

    const source = requireSource(provider.sources.test, "test")
    expect(source.secrets).toHaveLength(1)
    expect(source.capabilities.cookies).toEqual(["account.example.com"])
  })

  it("inherits provider request rules", () => {
    const requestRule = {
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          {
            header: "Referer",
            operation: "set",
            value: "https://example.com/",
          },
        ],
      },
      condition: {
        requestDomains: ["example.com"],
        resourceTypes: ["xmlhttprequest"],
      },
    } satisfies SourceRequestRule
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      defaults: {
        requestRules: [requestRule],
      },
      sources: {
        test: {
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })

    const source = requireSource(provider.sources.test, "test")
    expect(source.requestRules).toEqual([requestRule])
  })

  it("inherits provider vars and allows source overrides", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      defaults: {
        vars: {
          endpoint: {
            origin: "https://provider.example",
            version: "v1",
          },
        },
      },
      sources: {
        inherited: {
          loader: {
            type: "rss",
            url: "{{ source.vars.endpoint.origin }}/feed.xml",
          },
        },
        overridden: {
          vars: {
            endpoint: {
              version: "v2",
              optional: null,
            },
          },
          loader: {
            type: "rss",
            url: "{{ source.vars.endpoint.origin }}/{{ source.vars.endpoint.version }}/feed.xml",
          },
        },
      },
    })
    const inherited = requireSource(provider.sources.inherited, "inherited")
    const overridden = requireSource(provider.sources.overridden, "overridden")

    expect(inherited.capabilities.network).toEqual(["provider.example"])
    expect(overridden.capabilities.network).toEqual(["provider.example"])
    expect(inherited.vars).toEqual({
      endpoint: {
        origin: "https://provider.example",
        version: "v1",
      },
    })
    expect(overridden.vars).toEqual({
      endpoint: {
        origin: "https://provider.example",
        version: "v2",
        optional: null,
      },
    })
  })

  it("restricts Radar parameter templates to URL variables", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          params: {
            value: "{{ scope.params.value }}",
          },
          metadata: {
            desc: {
              select: [".profile .bio", ".bio"],
              transform: "normalize_whitespace",
            },
          },
        },
      },
    ]))).toThrow("Template path \"scope.params.value\" is not available")
  })

  it("rejects unsupported Radar match fields", () => {
    expect(() => resolveTestSource(createSourceConfig([{
      id: "test",
      match: {
        hosts: ["example.com"],
        url: { regex: "/users/" },
      },
    } as unknown as SourceRadarRule]))).toThrow("radar.0.match.url")
  })

  it("rejects unsupported Radar locations", () => {
    expect(() => resolveTestSource(createSourceConfig([{
      id: "test",
      match: {
        hosts: ["example.com"],
        location: "fragment",
      },
    } as unknown as SourceRadarRule]))).toThrow("radar.0.match.location")
  })

  it("rejects Radar-side parameter validation", () => {
    expect(() => resolveTestSource(createSourceConfig([{
      id: "test",
      match: {
        hosts: ["example.com"],
        paths: [{
          path: "/users/:id",
          params: { id: { format: "digits" } },
        }],
      },
    } as unknown as SourceRadarRule]))).toThrow("radar.0.match.paths.0")

    expect(() => resolveTestSource(createSourceConfig([{
      id: "test",
      match: {
        hosts: ["example.com"],
        query: { id: { format: "digits" } },
      },
    } as unknown as SourceRadarRule]))).toThrow("radar.0.match.query")
  })

  it("rejects unsafe parameter validation regexes", () => {
    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      params: {
        id: {
          type: "text",
          title: "ID",
          default: "123",
          validate: { regex: "^(a+)+$" },
        },
      },
    })).toThrow("test:test.params.id.validate.regex is invalid")
  })

  it("does not compile template syntax in non-template source fields", () => {
    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      params: {
        value: {
          type: "text",
          title: "Literal {{ label }}",
          default: "",
        },
      },
    })).not.toThrow()
  })

  it("rejects provider presentation fields in source metadata", () => {
    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      metadata: {
        title: "Test",
        icon: "source-icon",
      },
    } as unknown as SourceConfig)).toThrow(
      "sources.test.metadata.icon",
    )

    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      metadata: {
        title: "Test",
        color: "red",
      },
    } as unknown as SourceConfig)).toThrow(
      "sources.test.metadata.color",
    )
  })

  it("allows parsed parameters and page data in Radar metadata templates", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          params: {
            value: "{{ scope.query.value ?? scope.path.value }}",
          },
          metadata: {
            desc: {
              select: ".bio",
              template: "{{ scope.value }}",
            },
            title: "{{ scope.page.title ?? scope.params.value }}",
          },
        },
      },
    ]))).not.toThrow()
  })

  it("allows parameterized Radar rules without title metadata", () => {
    const config = createSourceConfig([
      {
        id: "test",
        match: {
          hosts: ["example.com"],
          paths: ["/topics/:value"],
        },
        patch: {
          params: {
            value: "{{ scope.path.value }}",
          },
        },
      },
    ])
    config.params = {
      value: {
        type: "text",
        title: "Value",
        default: "",
      },
    }

    expect(() => resolveTestSource(config)).not.toThrow()
  })

  it("rejects invalid Radar HTML fields", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            title: {
              select: [".page-title", 42],
            },
          },
        },
      },
    ] as unknown as SourceRadarRule[]))).toThrow(
      "test:test.radar.0.patch.metadata.title.select has an invalid CSS selector",
    )

    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            desc: {
              select: ".bio",
              attr: "invalid attribute",
            },
          },
        },
      },
    ]))).toThrow(
      "test:test.radar.0.patch.metadata.desc.attr has an invalid attribute name",
    )
  })

  it.each([0.1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid Radar priority %s",
    (priority) => {
      expect(() => resolveTestSource(createSourceConfig([{
        id: "test",
        match: { hosts: ["example.com"] },
        priority,
      }]))).toThrow(/radar\.0\.priority/)
    },
  )

  it("allows Radar to override source-owned presentation metadata", () => {
    const radar = [
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            title: "Dynamic title",
            badge: "https://example.com/badge.png",
            desc: "Dynamic description",
            home: "https://example.com/dynamic",
          },
        },
      },
    ] satisfies SourceRadarRule[]

    expect(() => resolveTestSource(createSourceConfig(radar))).not.toThrow()
  })

  it.each(["list", "ranking"] as const)("allows the %s presentation type", (type) => {
    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      metadata: { type },
    })).not.toThrow()

    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: { type },
        },
      },
    ] satisfies SourceRadarRule[]))).not.toThrow()
  })

  it("rejects an unsupported source presentation type", () => {
    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      metadata: { type: "timeline" },
    } as unknown as SourceConfig)).toThrow(
      "sources.test.metadata.type",
    )

    expect(() => resolveTestSource(createSourceConfig([{
      id: "test",
      match: { hosts: ["example.com"] },
      patch: { metadata: { type: "timeline" } },
    }] as unknown as SourceRadarRule[]))).toThrow(
      "test:test.radar.0.patch.metadata.type must be \"list\" or \"ranking\"",
    )
  })

  it("rejects provider metadata overrides in source and Radar metadata", () => {
    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      metadata: {
        title: "Test",
        category: "social",
      },
    } as unknown as SourceConfig)).toThrow(
      "sources.test.metadata.category",
    )

    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            category: "social",
          },
        },
      },
    ] as unknown as SourceRadarRule[]))).toThrow(
      "test:test.radar.0.patch.metadata.category is not supported",
    )

    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            icon: "injected-icon",
          },
        },
      },
    ] as unknown as SourceRadarRule[]))).toThrow(
      "test:test.radar.0.patch.metadata.icon is not supported",
    )

    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            color: "red",
          },
        },
      },
    ] as unknown as SourceRadarRule[]))).toThrow(
      "test:test.radar.0.patch.metadata.color is not supported",
    )
  })

  it("does not expose source metadata to Radar templates", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            title: "{{ source.title }}",
          },
        },
      },
    ]))).toThrow("Template path \"source.title\" is not available")
  })
})

describe("source Provider validation", () => {
  it("requires valid provider color metadata", () => {
    expect(() => resolveProvider("test", {
      title: "Provider",
      sources: { latest: { loader: { type: "rss", url: "https://example.com/feed" } } },
    })).toThrow(
      "color",
    )

    expect(() => resolveProvider("test", {
      title: "Provider",
      color: "invalid",
      sources: { latest: { loader: { type: "rss", url: "https://example.com/feed" } } },
    })).toThrow(
      "color",
    )
  })

  it("validates provider authoring containers and IDs at runtime", () => {
    expect(() => resolveProvider("test", {
      title: "Provider",
      color: "blue",
      sources: {},
    })).toThrow("Source count")

    expect(() => resolveProvider("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      defaults: "invalid",
      sources: { latest: { loader: { type: "rss", url: "https://example.com/feed" } } },
    })).toThrow(
      "defaults",
    )

    expect(() => resolveProvider("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      sources: {
        "invalid:id": {
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })).toThrow(
      "invalid:id",
    )
  })

  it("rejects source overrides for provider presentation metadata", () => {
    const provider = {
      title: "Provider",
      category: "social",
      icon: "provider-icon",
      color: "blue",
      sources: {
        latest: {
          metadata: {
            icon: "source-icon",
          },
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    }

    expect(() => resolveProvider("test", provider)).toThrow(
      "sources.latest.metadata.icon",
    )
  })

  it("rejects invalid Source versions and unknown configuration", () => {
    const createProvider = (version: unknown) => ({
      title: "Test Provider",
      color: "blue",
      sources: {
        latest: {
          version,
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })

    expect(() => resolveProvider("test", createProvider(0)))
      .toThrow("version")
    expect(() => resolveProvider("test", createProvider(1.5)))
      .toThrow("version")
    expect(() => resolveProvider("test", {
      ...createProvider(undefined),
      sources: {
        latest: {
          unknown: true,
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })).toThrow("sources.latest.unknown")
  })
})
