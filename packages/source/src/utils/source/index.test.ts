import type { SourceRequestRule } from "../../typings/sources"
import type { SourceConfig } from "./index"
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
    color: "blue",
    sources: { test: config },
  })
}

describe("source template contexts", () => {
  it("resolves source metadata from the metadata object", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      color: "blue",
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
    })
  })

  it("merges provider and source secrets into capabilities", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      color: "blue",
      secrets: [
        {
          key: "shared",
          type: "cookie",
          origin: "https://account.example.com",
          itemKey: "shared",
        },
      ],
      sources: {
        test: {
          secrets: [
            {
              key: "source",
              type: "localStorage",
              origin: "https://app.example.com",
              itemKey: "source",
            },
          ],
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

    expect(provider.sources.test.secrets).toHaveLength(2)
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
      color: "blue",
      requestRules: [requestRule],
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
      color: "blue",
      context: {
        origin: "https://provider.example",
      },
      sources: {
        inherited: {
          cache: "1h",
          loader: {
            type: "rss",
            url: "{{ context.origin }}/feed.xml",
          },
        },
        overridden: {
          context: {
            origin: "https://source.example",
          },
          cache: "1h",
          loader: {
            type: "rss",
            url: "{{ context.origin }}/feed.xml",
          },
        },
      },
    })

    expect(provider.sources.inherited.capabilities.network).toEqual(["provider.example"])
    expect(provider.sources.overridden.capabilities.network).toEqual(["source.example"])
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
  it("resolves a flat registry produced from provider authoring config", () => {
    const registry = flattenProviderConfig("test", {
      title: "Test Provider",
      color: "blue",
      category: "tech",
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
      providerTitle: "Test Provider",
      color: "blue",
      category: "tech",
      key: "latest",
    })
  })

  it("rejects provider containers and executable loaders", () => {
    expect(() => resolveSourceRegistry({
      test: {
        sources: {},
      },
    })).toThrow("Invalid registry source ID")

    expect(() => resolveSourceRegistry({
      "test:latest": {
        metadata: {
          providerTitle: "Test",
          color: "blue",
          category: "tech",
        },
        cache: "5m",
        loader: {
          type: "custom",
        },
      },
    })).toThrow("unsupported loader type")
  })

  it("rejects request rules for undeclared network hosts", () => {
    expect(() => resolveSourceRegistry({
      "test:latest": {
        metadata: {
          providerTitle: "Test",
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
