import { describe, expect, it } from "vitest"
import {
  parseExtensionConnectionCommandRequest,
} from "."

describe("extension connection protocol", () => {
  it("parses the native open-app request", () => {
    expect(parseExtensionConnectionCommandRequest({
      id: "open-id",
      type: "app.open",
    })).toEqual({ id: "open-id", type: "app.open" })
  })

  it("parses application operation requests", () => {
    expect(parseExtensionConnectionCommandRequest({
      id: "action-id",
      type: "application.action.execute",
      name: "collection.delete",
      input: { collectionId: "reading" },
    })).toEqual({
      id: "action-id",
      type: "application.action.execute",
      name: "collection.delete",
      input: { collectionId: "reading" },
    })
    expect(parseExtensionConnectionCommandRequest({
      id: "query-id",
      type: "application.query.list",
    })).toEqual({ id: "query-id", type: "application.query.list" })
    expect(() => parseExtensionConnectionCommandRequest({
      id: "action-id",
      type: "application.action.execute",
      name: "collection.delete",
      input: null,
    })).toThrow("Invalid extension command")
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
      retain: true,
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
      retain: true,
      providerId: "github",
      sourceId: "github:trending",
    })).toThrow("Invalid extension command")
  })
})
