import type { SourceRadarRule, SourceRequestRule } from "../types"
import type { ProviderConfig, SourceConfig } from "./index"
import { describe, expect, it } from "vitest"
import {
  flattenProviderConfig,
  resolveProvider,
  resolveSourceRegistry,
} from "./index"

function createSourceConfig(radar: NonNullable<SourceConfig["radar"]>): SourceConfig {
  return {
    metadata: {
      title: "Test",
    },
    cache: "1h",
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
        cache: "5m",
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
            load: async () => [{
              title: "Item",
              url: "/items/1",
            }],
          },
        },
      },
    })

    expect(provider.sources.latest).toMatchObject({
      baseUrl: "https://example.com/",
      metadata: {
        badge: "https://example.com/badge.png",
        home: "https://example.com/latest",
      },
    })
    await expect(provider.sources.latest.loader({})).resolves.toEqual([{
      title: "Item",
      url: "https://example.com/items/1",
    }])
  })

  it("infers structured loader capabilities from a relative request URL", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      color: "blue",
      defaults: {
        baseUrl: "https://api.example.com/v1/",
        cache: "5m",
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

    expect(provider.sources.latest.capabilities.network).toEqual(["api.example.com"])
  })

  it("preserves provider icon data URLs during expansion", () => {
    const icon = "data:image/svg+xml,%3Csvg%2F%3E"
    const provider = resolveProvider("test", {
      title: "Provider",
      icon,
      color: "blue",
      sources: {
        test: {
          cache: "1h",
          loader: {
            type: "custom",
            load: async () => [],
          },
        },
      },
    })

    expect(provider.sources.test.provider.icon).toBe(icon)
  })

  it("assigns provider source defaults before resolving sources", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      icon: "https://icons.folo.is/example.com",
      color: "blue",
      defaults: {
        cache: "5m",
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
            load: async () => [],
          },
        },
        overridden: {
          metadata: {
            title: "Override",
          },
          radar: [],
          loader: {
            type: "custom",
            load: async () => [],
          },
          capabilities: {
            network: ["override.example.com"],
          },
          cache: "1m",
        },
      },
    })

    expect(provider.sources.inherited).toMatchObject({
      cache: { version: 1, maxAge: "5m" },
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
      cache: { version: 1, maxAge: "1m" },
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
          cache: "1h",
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
          cache: "1h",
          loader: {
            type: "custom",
            load: async () => [],
          },
          capabilities: {
            network: [],
          },
        },
      },
    })

    expect(provider.sources.test.secrets).toHaveLength(1)
    expect(provider.sources.test.capabilities.cookies).toEqual(["account.example.com"])
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
          cache: "1h",
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })

    expect(provider.sources.test.requestRules).toEqual([requestRule])
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
          cache: "1h",
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
          cache: "1h",
          loader: {
            type: "rss",
            url: "{{ source.vars.endpoint.origin }}/{{ source.vars.endpoint.version }}/feed.xml",
          },
        },
      },
    })

    expect(provider.sources.inherited.capabilities.network).toEqual(["provider.example"])
    expect(provider.sources.overridden.capabilities.network).toEqual(["provider.example"])
    expect(provider.sources.inherited.vars).toEqual({
      endpoint: {
        origin: "https://provider.example",
        version: "v1",
      },
    })
    expect(provider.sources.overridden.vars).toEqual({
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
              template: "{{ scope.value | normalize_whitespace }}",
            },
          },
        },
      },
    ]))).toThrow("Template path \"scope.params.value\" is not available")
  })

  it("rejects unsafe Radar path regexes", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: {
          hosts: ["example.com"],
          paths: {
            include: [{ regex: "^(a+)+$" }],
          },
        },
      },
    ]))).toThrow("match.paths.include.0.regex is invalid")
  })

  it("does not compile Liquid syntax in non-template source fields", () => {
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
      "test:test.metadata.icon is not supported",
    )

    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      metadata: {
        title: "Test",
        color: "red",
      },
    } as unknown as SourceConfig)).toThrow(
      "test:test.metadata.color is not supported",
    )
  })

  it("allows parsed parameters and page data in Radar metadata templates", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          params: {
            value: "{{ scope.query.value | default: scope.path.value }}",
          },
          metadata: {
            desc: {
              select: ".bio",
              template: "{{ scope.value }}",
            },
            title: "{{ scope.page.title | default: scope.params.value }}",
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

  it("rejects declared source presentation types", () => {
    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      metadata: {
        type: "timeline",
      },
    } as unknown as SourceConfig)).toThrow(
      "test:test.metadata.type is not supported",
    )

    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            type: "ranking",
          },
        },
      },
    ] as unknown as SourceRadarRule[]))).toThrow(
      "test:test.radar.0.patch.metadata.type is not supported",
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
      "test:test.metadata.category is not supported",
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

describe("source registry", () => {
  it("requires valid provider color metadata", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      sources: {},
    } as unknown as ProviderConfig)).toThrow(
      "Provider \"test\" has invalid metadata",
    )

    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      color: "invalid",
      sources: {},
    } as unknown as ProviderConfig)).toThrow(
      "Provider \"test\" has invalid metadata",
    )
  })

  it("validates provider authoring containers and IDs at runtime", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      color: "blue",
      sources: {},
    })).not.toThrow()

    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      defaults: "invalid",
      sources: {},
    } as unknown as ProviderConfig)).toThrow(
      "Provider \"test\" has invalid defaults",
    )

    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      defaults: {
        cache: "5m",
      },
      sources: {
        "invalid:id": {
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })).toThrow(
      "Provider \"test\" has invalid source ID \"invalid:id\"",
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
            color: "red",
            icon: "source-icon",
          },
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
          cache: "5m",
        },
      },
    } as unknown as ProviderConfig

    expect(() => flattenProviderConfig("test", provider)).toThrow(
      "test:latest.metadata.color is not supported",
    )
  })

  it("flattens provider source defaults into declarative sources", () => {
    const registry = flattenProviderConfig("test", {
      title: "Test Provider",
      category: "social",
      icon: "https://icons.folo.is/example.com",
      color: "blue",
      defaults: {
        cache: "5m",
        vars: {
          endpoint: {
            origin: "https://example.com",
            version: "v1",
          },
        },
        loader: {
          type: "rss",
          url: "{{ source.vars.endpoint.origin }}/default.xml",
        },
        metadata: {
          home: "https://example.com",
        },
      },
      sources: {
        latest: {
          metadata: {
            title: "Latest",
          },
          vars: {
            endpoint: {
              optional: null,
              version: "v2",
            },
          },
          loader: {
            url: "{{ source.vars.endpoint.origin }}/feed.xml",
          },
        },
      },
    })

    expect(registry["test:latest"]?.vars).toEqual({
      endpoint: {
        origin: "https://example.com",
        optional: null,
        version: "v2",
      },
    })
    expect(registry["test:latest"]?.loader).toEqual({
      type: "rss",
      url: "{{ source.vars.endpoint.origin }}/feed.xml",
    })
    expect(registry["test:latest"]?.provider).toEqual({
      title: "Test Provider",
      category: "social",
      icon: "https://icons.folo.is/example.com",
      color: "blue",
    })
    expect(resolveSourceRegistry(registry)["test:latest"]).toMatchObject({
      cache: { version: 1, maxAge: "5m" },
      metadata: {
        title: "Latest",
      },
      provider: {
        icon: "https://icons.folo.is/example.com",
        color: "blue",
      },
    })
  })

  it("rejects sources missing required properties after defaults are assigned", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Test Provider",
      category: "social",
      color: "blue",
      sources: {
        latest: {
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })).toThrow("Source \"test:latest\" is missing a cache policy")
  })

  it("resolves a flat registry produced from provider authoring config", () => {
    const registry = flattenProviderConfig("test", {
      title: "Test Provider",
      category: "social",
      color: "blue",
      sources: {
        latest: {
          cache: "5m",
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })

    expect(resolveSourceRegistry(registry)["test:latest"]).toMatchObject({
      provider: {
        title: "Test Provider",
        category: "social",
        color: "blue",
      },
    })
  })

  it("rejects provider containers and resolves missing loaders from executable bindings", () => {
    expect(() => resolveSourceRegistry({
      test: {
        sources: {},
      },
    })).toThrow("Invalid registry source ID")

    const executableRegistry = {
      "test:latest": {
        provider: {
          title: "Test",
          category: "social",
          color: "blue",
        },
        cache: "5m",
        capabilities: {
          network: [],
        },
      },
    }
    expect(() => resolveSourceRegistry(executableRegistry))
      .toThrow("requires an executable loader")
    expect(resolveSourceRegistry(executableRegistry, {
      "test:latest": async () => [],
    })["test:latest"]?.loader).toBeTypeOf("function")
  })

  it("rejects inconsistent provider metadata across flat sources", () => {
    const first = flattenProviderConfig("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      defaults: {
        cache: "5m",
      },
      sources: {
        first: {
          loader: {
            type: "rss",
            url: "https://example.com/first.xml",
          },
        },
      },
    })
    const second = flattenProviderConfig("test", {
      title: "Provider",
      category: "forum",
      color: "blue",
      defaults: {
        cache: "5m",
      },
      sources: {
        second: {
          loader: {
            type: "rss",
            url: "https://example.com/second.xml",
          },
        },
      },
    })

    expect(() => resolveSourceRegistry({
      ...first,
      ...second,
    })).toThrow("Provider \"test\" has inconsistent metadata")
  })

  it("rejects invalid display and provider metadata in flat registries", () => {
    expect(() => resolveSourceRegistry({
      "test:latest": {
        provider: {
          title: "Test",
          category: "social",
          color: "not-a-color",
        },
        cache: "5m",
        loader: {
          type: "rss",
          url: "https://example.com/feed.xml",
        },
      },
    })).toThrow("Registry source \"test:latest\" has invalid provider metadata")

    expect(() => resolveSourceRegistry({
      "test:latest": {
        provider: {
          title: "Test",
          category: "invalid",
          color: "blue",
        },
        cache: "5m",
        loader: {
          type: "rss",
          url: "https://example.com/feed.xml",
        },
      },
    })).toThrow("Registry source \"test:latest\" has invalid provider metadata")
  })

  it("rejects request rules for undeclared network hosts", () => {
    expect(() => resolveSourceRegistry({
      "test:latest": {
        provider: {
          title: "Test",
          category: "social",
          color: "blue",
        },
        cache: "5m",
        loader: {
          type: "rss",
          url: "https://example.com/feed.xml",
        },
        requestRules: [
          {
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
              requestDomains: ["other.example"],
              resourceTypes: ["xmlhttprequest"],
            },
          },
        ],
      },
    })).toThrow("uses undeclared domain")
  })
})
