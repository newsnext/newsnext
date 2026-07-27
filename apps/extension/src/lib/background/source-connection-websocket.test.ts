import { describe, expect, it, vi } from "vitest"

const browserMock = vi.hoisted(() => ({
  alarms: {
    clear: vi.fn().mockResolvedValue(true),
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
}))

vi.mock("#imports", () => ({
  browser: browserMock,
}))

vi.mock("./source-runner", () => ({
  listConnectedSources: vi.fn(),
  runConnectedSource: vi.fn(),
}))

const {
  parseSourceConnectionRequest,
  resolveSourceConnectionState,
  serializeSourceConnectionError,
} = await import("./source-connection-websocket")

describe("source connection WebSocket", () => {
  it("reports the connection state", () => {
    expect(resolveSourceConnectionState(0)).toBe("connecting")
    expect(resolveSourceConnectionState(1)).toBe("connected")
    expect(resolveSourceConnectionState(3)).toBe("disconnected")
    expect(resolveSourceConnectionState()).toBe("disconnected")
  })

  it("preserves actionable login error metadata", () => {
    const error = Object.assign(new Error("Source login required."), {
      name: "SourceLoginRequiredError",
      code: "SOURCE_LOGIN_REQUIRED",
      loginUrl: "https://example.com/login",
    })

    expect(serializeSourceConnectionError(error)).toMatchObject({
      name: "SourceLoginRequiredError",
      message: "Source login required.",
      code: "SOURCE_LOGIN_REQUIRED",
      loginUrl: "https://example.com/login",
    })
  })

  it("validates source run requests", () => {
    expect(parseSourceConnectionRequest(JSON.stringify({
      id: "list-request-id",
      type: "source.list",
    }))).toEqual({
      id: "list-request-id",
      type: "source.list",
    })

    expect(parseSourceConnectionRequest(JSON.stringify({
      id: "registered-request-id",
      type: "source.run",
      sourceId: "github:trending",
      params: { language: "typescript" },
    }))).toEqual({
      id: "registered-request-id",
      type: "source.run",
      sourceId: "github:trending",
      params: { language: "typescript" },
    })

    expect(parseSourceConnectionRequest(JSON.stringify({
      id: "request-id",
      type: "source.run",
      providerId: "example",
      sourceId: "latest",
      provider: {},
      params: { limit: 10 },
      useProviderSecrets: true,
    }))).toMatchObject({
      id: "request-id",
      type: "source.run",
      useProviderSecrets: true,
    })

    expect(() => parseSourceConnectionRequest(JSON.stringify({
      id: "request-id",
      type: "source.run",
      providerId: "example",
      sourceId: "latest",
      params: [],
    }))).toThrow("Unsupported source run message")

    expect(() => parseSourceConnectionRequest(JSON.stringify({
      id: "request-id",
      type: "source.run",
      providerId: "example",
      sourceId: "latest",
    }))).toThrow("Unsupported source run message")
  })
})
