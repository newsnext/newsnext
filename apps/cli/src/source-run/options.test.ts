import { describe, expect, it } from "vitest"
import { normalizeSourceConnectionUrl } from "../source-connection-options"
import {
  loadProvider,
  loadSourceRunTarget,
  parseSourceRunOptions,
} from "./options"

describe("source run options", () => {
  it("parses flags and merges individual params over JSON params", () => {
    const options = parseSourceRunOptions([
      "provider.json",
      "latest",
      "--params",
      "{\"limit\":10,\"topic\":\"news\"}",
      "--param",
      "limit=20",
      "--param",
      "enabled=true",
      "--provider-id",
      "custom",
      "--use-provider-secrets",
    ])

    expect(options.params).toEqual({
      limit: 20,
      topic: "news",
      enabled: true,
    })
    expect(options.providerId).toBe("custom")
    expect(options.useProviderSecrets).toBe(true)
  })

  it("adds the default port to a loopback URL", () => {
    expect(normalizeSourceConnectionUrl("ws://127.0.0.1").href)
      .toBe("ws://127.0.0.1:43110/")
  })

  it("infers the source ID for a single-source provider", async () => {
    const options = parseSourceRunOptions([
      "packages/registry/src/zhihu.json",
    ])

    const provider = await loadProvider(options)
    expect(provider.providerId).toBe("zhihu")
    expect(provider.sourceId).toBe("hot-list")
  })

  it("treats a provider:source input as a registered extension source", async () => {
    const options = parseSourceRunOptions([
      "github:trending",
      "--param",
      "language=typescript",
    ])

    await expect(loadSourceRunTarget(options)).resolves.toEqual({
      kind: "registered",
      sourceId: "github:trending",
    })
  })

  it("keeps JSON paths in provider file mode", async () => {
    const options = parseSourceRunOptions([
      "packages/registry/src/zhihu.json",
    ])

    await expect(loadSourceRunTarget(options)).resolves.toMatchObject({
      kind: "provider",
      providerId: "zhihu",
      sourceId: "hot-list",
    })
  })

  it("rejects provider-only flags for registered sources", async () => {
    const options = parseSourceRunOptions([
      "github:trending",
      "--use-provider-secrets",
    ])

    await expect(loadSourceRunTarget(options)).rejects.toThrow(
      "--use-provider-secrets is only available for provider files",
    )
  })

  it("lists source IDs when a multi-source provider is ambiguous", async () => {
    const options = parseSourceRunOptions([
      "packages/registry/src/hackernews.json",
    ])

    await expect(loadProvider(options)).rejects.toThrow(
      "Source ID required. Available sources: ask, newest, show, top",
    )
  })

  it("rejects provider IDs that cannot form a source ID", async () => {
    const options = parseSourceRunOptions([
      "packages/registry/src/zhihu.json",
      "--provider-id",
      "invalid:id",
    ])

    await expect(loadProvider(options)).rejects.toThrow(
      "Provider ID must be a non-empty ID without colons or whitespace",
    )
  })

  it("rejects legacy positional params", () => {
    expect(() => parseSourceRunOptions([
      "provider.json",
      "latest",
      "{\"limit\":10}",
    ])).toThrow("Unexpected positional argument")
  })
})
