import { beforeEach, describe, expect, it, vi } from "vitest"

const browserMock = vi.hoisted(() => ({
  permissions: {
    contains: vi.fn(),
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://newsnext${path}`),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  windows: {
    create: vi.fn(),
    onRemoved: {
      addListener: vi.fn(),
    },
  },
}))

vi.mock("#imports", () => ({ browser: browserMock }))

beforeEach(() => {
  browserMock.permissions.contains.mockReset()
  browserMock.runtime.getURL.mockClear()
  browserMock.runtime.onMessage.addListener.mockReset()
  browserMock.windows.create.mockReset()
  browserMock.windows.onRemoved.addListener.mockReset()
  vi.resetModules()
  browserMock.windows.create.mockResolvedValue({ id: 42 })
})

describe("cli permission prompt", () => {
  it("returns immediately when access is already granted", async () => {
    browserMock.permissions.contains.mockResolvedValue(true)
    const { requestCliPermission } = await import("./cli-permission")

    await expect(requestCliPermission(
      { origins: ["https://example.com/*"] },
      "Allow example.com.",
    )).resolves.toBe(true)
    expect(browserMock.windows.create).not.toHaveBeenCalled()
  })

  it("opens a scoped prompt and verifies the granted permission", async () => {
    browserMock.permissions.contains
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const { requestCliPermission } = await import("./cli-permission")
    const request = { origins: ["https://example.com/*"] }
    const result = requestCliPermission(request, "Allow example.com.")

    await vi.waitFor(() => expect(browserMock.windows.create).toHaveBeenCalledOnce())
    expect(browserMock.windows.create).toHaveBeenCalledWith(expect.objectContaining({
      height: 320,
      width: 620,
    }))
    const popupUrl = browserMock.windows.create.mock.calls[0]![0].url as string
    const requestId = popupUrl.split("#")[1]!
    const listener = browserMock.runtime.onMessage.addListener.mock.calls[0]![0]
    const sender = { url: popupUrl }

    await expect(listener({ requestId, type: "cliPermission.get" }, sender)).resolves.toEqual({
      description: "Allow example.com.",
      request,
    })
    await expect(listener({
      granted: true,
      requestId,
      type: "cliPermission.complete",
    }, sender)).resolves.toEqual({ granted: true })
    await expect(result).resolves.toBe(true)
    expect(browserMock.permissions.contains).toHaveBeenLastCalledWith(request)
  })

  it("declines the request when the permission window is closed", async () => {
    browserMock.permissions.contains.mockResolvedValue(false)
    const { requestCliPermission } = await import("./cli-permission")
    const result = requestCliPermission(
      { origins: ["https://example.com/*"] },
      "Allow example.com.",
    )

    await vi.waitFor(() => expect(browserMock.windows.create).toHaveBeenCalledOnce())
    const onRemoved = browserMock.windows.onRemoved.addListener.mock.calls[0]![0]
    onRemoved(42)
    await expect(result).resolves.toBe(false)
  })
})
