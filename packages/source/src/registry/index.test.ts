import type { SourceRequestRule } from "../types"
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
    defaults: {
      metadata: {
        color: "blue",
      },
    },
    sources: { test: config },
  })
}

describe("source template contexts", () => {
  it("assigns provider source defaults before resolving sources", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
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
      title: "Override",
      type: "timeline",
      radar: [],
    })
  })

  it("resolves source metadata from the metadata object", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
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

  it("inherits provider context and allows source overrides", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      defaults: {
        metadata: {
          color: "blue",
        },
        context: {
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
            url: "{{ context.endpoint.origin }}/feed.xml",
          },
        },
        overridden: {
          context: {
            endpoint: {
              version: "v2",
              optional: null,
            },
          },
          cache: "1h",
          loader: {
            type: "rss",
            url: "{{ context.endpoint.origin }}/{{ context.endpoint.version }}/feed.xml",
          },
        },
      },
    })

    expect(provider.sources.inherited.capabilities.network).toEqual(["provider.example"])
    expect(provider.sources.overridden.capabilities.network).toEqual(["provider.example"])
  })

  it("restricts Radar parameter templates to URL variables", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          params: {
            value: "{{ params.value }}",
          },
        },
      },
    ]))).toThrow("Template root \"params\" is not available")
  })

  it("allows parsed parameters and page data in Radar metadata templates", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          params: {
            value: "{{ query.value | default: path.value }}",
          },
          metadata: {
            title: "{{ page.title | default: params.value }}",
          },
        },
      },
    ]))).not.toThrow()
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
    ]))).toThrow("Template root \"source\" is not available")
  })
})

describe("source registry", () => {
  it("rejects legacy provider-level source defaults", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      color: "blue",
      sources: {},
    } as unknown as ProviderConfig)).toThrow(
      "Provider \"test\" has unsupported property \"color\"",
    )
  })

  it("validates provider authoring containers and IDs at runtime", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Provider",
      defaults: "invalid",
      sources: {},
    } as unknown as ProviderConfig)).toThrow(
      "Provider \"test\" has invalid defaults",
    )

    expect(() => flattenProviderConfig("test", {
      title: "Provider",
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

  it("keeps provider title fixed while allowing source metadata overrides", () => {
    const provider = {
      title: "Provider",
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
      },
      metadata: {
        color: "red",
        icon: "source-icon",
      },
    })
    expect(resolveProvider("test", provider).sources.latest).toMatchObject({
      provider: {
        title: "Provider",
      },
      icon: "source-icon",
      color: "red",
    })
  })

  it("flattens provider source defaults into declarative sources", () => {
    const registry = flattenProviderConfig("test", {
      title: "Test Provider",
      defaults: {
        cache: "5m",
        context: {
          endpoint: {
            origin: "https://example.com",
            version: "v1",
          },
        },
        loader: {
          type: "rss",
          url: "{{ context.endpoint.origin }}/default.xml",
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
          context: {
            endpoint: {
              optional: null,
              version: "v2",
            },
          },
          loader: {
            url: "{{ context.endpoint.origin }}/feed.xml",
          },
        },
      },
    })

    expect(registry["test:latest"]?.context).toEqual({
      endpoint: {
        origin: "https://example.com",
        optional: null,
        version: "v2",
      },
    })
    expect(registry["test:latest"]?.loader).toEqual({
      type: "rss",
      url: "{{ context.endpoint.origin }}/feed.xml",
    })
    expect(registry["test:latest"]?.provider).toEqual({
      title: "Test Provider",
    })
    expect(resolveSourceRegistry(registry)["test:latest"]).toMatchObject({
      cache: { version: 1, maxAge: "5m" },
      title: "Latest",
      type: "timeline",
    })
  })

  it("rejects sources missing required properties after defaults are assigned", () => {
    expect(() => flattenProviderConfig("test", {
      title: "Test Provider",
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
      defaults: {
        metadata: {
          color: "blue",
          category: "tech",
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
      },
      color: "blue",
      category: "tech",
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
        },
        metadata: {
          color: "blue",
          category: "tech",
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
      title: "Other Provider",
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

  it("rejects invalid display metadata in flat registries", () => {
    expect(() => resolveSourceRegistry({
      "test:latest": {
        provider: {
          title: "Test",
        },
        metadata: {
          color: "not-a-color",
          category: "tech",
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
        },
        metadata: {
          color: "blue",
          category: "invalid",
        },
        cache: "5m",
        loader: {
          type: "rss",
          url: "https://example.com/feed.xml",
        },
      },
    })).toThrow("Source \"test:latest\" is missing valid display metadata")
  })

  it("rejects request rules for undeclared network hosts", () => {
    expect(() => resolveSourceRegistry({
      "test:latest": {
        provider: {
          title: "Test",
        },
        metadata: {
          color: "blue",
          category: "tech",
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
