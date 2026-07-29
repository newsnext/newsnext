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
    defaults: {
      metadata: {
        color: "blue",
      },
    },
    sources: { test: config },
  })
}

describe("source template vars", () => {
  it("assigns provider source defaults before resolving sources", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      defaults: {
        cache: "5m",
        capabilities: {
          network: ["api.example.com"],
          cookies: ["account.example.com"],
        },
        metadata: {
          color: "blue",
          home: "https://example.com",
          type: "timeline",
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
      home: "https://example.com",
      icon: "https://icons.folo.is/example.com",
      type: "timeline",
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
      home: "https://example.com",
      icon: "https://icons.folo.is/example.com",
      title: "Override",
      type: "timeline",
      radar: [],
    })
  })

  it("resolves source metadata from the metadata object", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      defaults: {
        metadata: {
          color: "blue",
        },
      },
      sources: {
        test: {
          metadata: {
            title: "Source",
            type: "timeline",
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
      title: "Source",
      type: "timeline",
      home: "https://example.com/source",
      icon: "https://icons.folo.is/example.com",
    })
  })

  it("inherits provider default secrets into capabilities", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      category: "social",
      defaults: {
        metadata: {
          color: "blue",
        },
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
      defaults: {
        metadata: {
          color: "blue",
        },
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
      defaults: {
        metadata: {
          color: "blue",
        },
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

  it("rejects Liquid templates in source metadata", () => {
    expect(() => resolveTestSource({
      ...createSourceConfig([]),
      metadata: {
        title: "Test",
        icon: "https://example.com/{{ scope.params.value }}.png",
      },
    })).toThrow(
      "Liquid templates are not allowed at test:test.metadata.icon; use a Radar metadata patch for dynamic values",
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

  it("allows Radar to override source presentation metadata", () => {
    const radar = [
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            title: "Dynamic title",
            icon: "https://example.com/dynamic.png",
            badge: "https://example.com/badge.png",
            desc: "Dynamic description",
            home: "https://example.com/dynamic",
            color: "red",
            type: "hottest",
          },
        },
      },
    ] satisfies SourceRadarRule[]

    expect(() => resolveTestSource(createSourceConfig(radar))).not.toThrow()
  })

  it("rejects category overrides in source and Radar metadata", () => {
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
  it("rejects legacy provider-level source defaults", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      category: "social",
      color: "blue",
      sources: {},
    } as unknown as ProviderConfig)).toThrow(
      "Provider \"test\" has unsupported property \"color\"",
    )
  })

  it("validates provider authoring containers and IDs at runtime", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      sources: {},
    })).not.toThrow()

    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      category: "social",
      defaults: "invalid",
      sources: {},
    } as unknown as ProviderConfig)).toThrow(
      "Provider \"test\" has invalid defaults",
    )

    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      category: "social",
      defaults: {
        cache: "5m",
        metadata: {
          color: "blue",
        },
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

  it("keeps provider metadata fixed while allowing source metadata overrides", () => {
    const provider = {
      title: "Provider",
      category: "social",
      defaults: {
        metadata: {
          color: "blue",
        },
      },
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

    expect(flattenProviderConfig("test", provider)["test:latest"]).toMatchObject({
      provider: {
        title: "Provider",
        category: "social",
      },
      metadata: {
        color: "red",
        icon: "source-icon",
      },
    })
    expect(resolveProvider("test", provider).sources.latest).toMatchObject({
      provider: {
        title: "Provider",
        category: "social",
      },
      icon: "source-icon",
      color: "red",
    })
  })

  it("flattens provider source defaults into declarative sources", () => {
    const registry = flattenProviderConfig("test", {
      title: "Test Provider",
      category: "social",
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
          color: "blue",
          home: "https://example.com",
          type: "timeline",
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
    })
    expect(registry["test:latest"]?.metadata?.icon).toBe(
      "https://icons.folo.is/example.com",
    )
    expect(resolveSourceRegistry(registry)["test:latest"]).toMatchObject({
      cache: { version: 1, maxAge: "5m" },
      icon: "https://icons.folo.is/example.com",
      title: "Latest",
      type: "timeline",
    })
  })

  it("rejects sources missing required properties after defaults are assigned", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Test Provider",
      category: "social",
      defaults: {
        metadata: {
          color: "blue",
        },
      },
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
      defaults: {
        metadata: {
          color: "blue",
        },
      },
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
      },
      color: "blue",
      key: "latest",
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
        },
        metadata: {
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

  it("rejects inconsistent provider identity across flat sources", () => {
    const first = flattenProviderConfig("test", {
      title: "Provider",
      category: "social",
      defaults: {
        cache: "5m",
        metadata: {
          color: "blue",
        },
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
      defaults: {
        cache: "5m",
        metadata: {
          color: "blue",
        },
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
        },
        metadata: {
          color: "not-a-color",
        },
        cache: "5m",
        loader: {
          type: "rss",
          url: "https://example.com/feed.xml",
        },
      },
    })).toThrow("Source \"test:latest\" is missing valid display metadata")

    expect(() => resolveSourceRegistry({
      "test:latest": {
        provider: {
          title: "Test",
          category: "invalid",
        },
        metadata: {
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
        },
        metadata: {
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
