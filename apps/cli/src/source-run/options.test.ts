import { describe, expect, it } from "vitest"
import { normalizeSourceConnectionUrl } from "../source-connection-options"
import { parseSourceRunOptions } from "./options"

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

  it("rejects legacy positional params", () => {
    expect(() => parseSourceRunOptions([
      "provider.json",
      "latest",
      "{\"limit\":10}",
    ])).toThrow("Unexpected positional argument")
  })
})
