import { describe, expect, it, vi } from "vitest"

const { getStatusMock, setEnabledMock } = vi.hoisted(() => ({
  getStatusMock: vi.fn().mockReturnValue({
    enabled: false,
    state: "disabled",
    url: "ws://127.0.0.1:43110",
  }),
  setEnabledMock: vi.fn().mockResolvedValue({
    enabled: true,
    state: "connecting",
    url: "ws://127.0.0.1:43110",
  }),
}))

vi.mock("./source-connection-websocket", () => ({
  getSourceConnectionStatus: getStatusMock,
  setSourceConnectionEnabled: setEnabledMock,
}))

const { createBackgroundSourceConnectionService } = await import("./source-connection-service")

describe("source connection service", () => {
  it("exposes the current connection status", async () => {
    const service = createBackgroundSourceConnectionService()

    await expect(service.getStatus()).resolves.toMatchObject({
      enabled: false,
      state: "disabled",
      url: "ws://127.0.0.1:43110",
    })
  })

  it("updates the persisted connection preference", async () => {
    const service = createBackgroundSourceConnectionService()

    await expect(service.setEnabled(true)).resolves.toMatchObject({
      enabled: true,
      state: "connecting",
    })
    expect(setEnabledMock).toHaveBeenCalledWith(true)
  })
})
