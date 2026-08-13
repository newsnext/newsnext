import { describe, expect, it } from "vitest"
import {
  parseExtensionConnectionCommandRequest,
} from "."

describe("extension connection protocol", () => {
  it("parses board list requests", () => {
    expect(parseExtensionConnectionCommandRequest({
      id: "board-list",
      type: "board.list",
    })).toEqual({
      id: "board-list",
      type: "board.list",
    })
  })

  it("parses instance list requests", () => {
    expect(parseExtensionConnectionCommandRequest({
      id: "instance-list",
      type: "instance.list",
    })).toEqual({
      id: "instance-list",
      type: "instance.list",
    })
  })

  it("validates command-specific fields", () => {
    expect(parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "fetch",
      url: "https://example.com/api",
      method: "POST",
      headers: [["content-type", "application/json"]],
      body: "{}",
      timeoutMs: 10_000,
    })).toEqual({
      id: "request-id",
      type: "fetch",
      url: "https://example.com/api",
      method: "POST",
      headers: [["content-type", "application/json"]],
      body: "{}",
      timeoutMs: 10_000,
    })
    expect(() => parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "fetch",
      url: "https://example.com/api",
      method: "GET",
      headers: { accept: "application/json" },
      timeoutMs: 10_000,
    })).toThrow("Invalid extension command")
    expect(() => parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "fetch",
      url: "file:///tmp/example",
      method: "GET",
      headers: [],
      timeoutMs: 10_000,
    })).toThrow("Invalid extension command")
    expect(parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "source.run",
      sourceId: "github:trending",
      params: { language: "typescript" },
    })).toMatchObject({
      id: "request-id",
      type: "source.run",
      sourceId: "github:trending",
    })
    expect(() => parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "source.run",
      providerId: "github",
      sourceId: "github:trending",
    })).toThrow("Invalid extension command")
    expect(() => parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "source-history.get",
      instanceId: "github:trending::V1StGXR8_Z5j",
      observedAt: "yesterday",
    })).toThrow("Invalid extension command")
    expect(parseExtensionConnectionCommandRequest({
      id: "request-id",
      type: "source-history.get",
      instanceId: "github:trending::V1StGXR8_Z5j",
      observedAt: 1_786_212_000_000,
    })).toMatchObject({
      instanceId: "github:trending::V1StGXR8_Z5j",
      observedAt: 1_786_212_000_000,
    })
  })
})
