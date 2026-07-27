import { describe, expect, it, vi } from "vitest"

vi.mock("#imports", () => ({
  browser: {},
}))

const { createBackgroundSourceConnectionService } = await import("./source-connection-service")

describe("source connection service", () => {
  it("exposes the current connection status", async () => {
    const service = createBackgroundSourceConnectionService()

    await expect(service.getStatus()).resolves.toMatchObject({
      state: "disconnected",
      url: "ws://127.0.0.1:43110",
    })
  })
})
