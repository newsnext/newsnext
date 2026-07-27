import { afterEach, describe, expect, it, vi } from "vitest"
import {
  executeThroughDaemon,
  getDaemonStatus,
} from "./daemon"
import {
  DAEMON_EXECUTE_PATH,
  DAEMON_STATUS_PATH,
  getDaemonEndpoint,
} from "./daemon-protocol"
import { SourceConnectionRemoteError } from "./source-run/session"

const wsUrl = new URL("ws://127.0.0.1:43110")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("newsNext daemon client", () => {
  it("maps WebSocket URLs to fixed loopback control endpoints", () => {
    expect(getDaemonEndpoint(
      new URL("ws://127.0.0.1:43110/custom?token=value"),
      DAEMON_STATUS_PATH,
    ).href).toBe("http://127.0.0.1:43110/__newsnext/status")
  })

  it("reads daemon and extension status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      pid: 123,
      startedAt: 1,
      url: wsUrl.href,
      instances: [],
    }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(getDaemonStatus(wsUrl)).resolves.toMatchObject({
      pid: 123,
      instances: [],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      getDaemonEndpoint(wsUrl, DAEMON_STATUS_PATH),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it("preserves extension-side source errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      ok: false,
      kind: "source",
      error: {
        name: "SourceLoginRequiredError",
        message: "Source login required.",
        code: "SOURCE_LOGIN_REQUIRED",
      },
    }))
    vi.stubGlobal("fetch", fetchMock)

    const execution = executeThroughDaemon({
      request: {
        id: "request-id",
        type: "source.run",
        providerId: "example",
        sourceId: "latest",
        provider: {},
      },
      timeoutMs: 1_000,
    }, {
      wsUrl,
      timeoutMs: 1_000,
    })

    await expect(execution).rejects.toBeInstanceOf(SourceConnectionRemoteError)
    expect(fetchMock).toHaveBeenCalledWith(
      getDaemonEndpoint(wsUrl, DAEMON_EXECUTE_PATH),
      expect.objectContaining({ method: "POST" }),
    )
  })
})
