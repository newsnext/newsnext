import { beforeEach, describe, expect, it, vi } from "vitest"

const { browserMock, browserStorageLocalMock } = vi.hoisted(() => ({
  browserMock: {
    cookies: {
      get: vi.fn(),
    },
    scripting: {
      executeScript: vi.fn(),
    },
    tabs: {
      query: vi.fn(),
    },
  },
  browserStorageLocalMock: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}))

vi.mock("wxt/browser", () => ({
  browser: browserMock,
}))

vi.mock("wxt/utils/storage", () => ({
  storage: browserStorageLocalMock,
}))

const { SourceLoginRequiredError, resolveSourceSecrets, updateSourceSecrets } = await import("./source-secrets")

describe("source secrets", () => {
  const localStorageValues: Record<string, string> = {
    token: "local-secret",
    refresh: "refresh-secret",
    device: "device-secret",
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    browserMock.cookies.get.mockResolvedValue({ value: "cookie-secret" })
    browserStorageLocalMock.setItem.mockResolvedValue(undefined)
    browserStorageLocalMock.getItem.mockResolvedValue({
      jike: {
        accessToken: "vars-access-token",
        refreshToken: "vars-refresh-token",
      },
    })
    browserMock.scripting.executeScript.mockImplementation(async (injection: { args?: unknown[] }) => {
      const [key] = injection.args ?? []
      return [{ result: typeof key === "string" ? ` ${localStorageValues[key] ?? ""} ` : undefined }]
    })
    browserMock.tabs.query.mockResolvedValue([{ id: 7 }])
  })

  it("supports legacy string secret cache values", async () => {
    browserStorageLocalMock.getItem.mockResolvedValueOnce(JSON.stringify({
      jike: {
        accessToken: "vars-access-token",
        refreshToken: "vars-refresh-token",
      },
    }))

    await expect(resolveSourceSecrets({
      secrets: [
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "token",
          cache: true,
        },
      ],
    }, "jike")).resolves.toEqual({
      accessToken: "vars-access-token",
    })
  })

  it("resolves localStorage secrets from extension cache before reading a tab", async () => {
    await expect(resolveSourceSecrets({
      secrets: [
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "token",
          cache: true,
        },
        {
          key: "refreshToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "refresh",
        },
      ],
    }, "jike")).resolves.toEqual({
      accessToken: "vars-access-token",
      refreshToken: "vars-refresh-token",
    })

    expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
    expect(browserStorageLocalMock.setItem).not.toHaveBeenCalled()
  })

  it("resolves cookie secrets from extension cache before reading cookies", async () => {
    browserStorageLocalMock.getItem.mockResolvedValueOnce({
      jike: {
        csrfToken: "cached-cookie-secret",
      },
    })

    await expect(resolveSourceSecrets({
      secrets: [
        {
          key: "csrfToken",
          type: "cookie",
          origin: "https://x.com",
          itemKey: "ct0",
        },
      ],
    }, "jike")).resolves.toEqual({
      csrfToken: "cached-cookie-secret",
    })

    expect(browserMock.cookies.get).not.toHaveBeenCalled()
  })

  it("resolves cookie and localStorage secrets", async () => {
    browserStorageLocalMock.getItem.mockResolvedValueOnce(undefined)

    await expect(resolveSourceSecrets({
      secrets: [
        {
          key: "csrfToken",
          type: "cookie",
          origin: "https://x.com",
          itemKey: "ct0",
        },
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "token",
        },
      ],
    })).resolves.toEqual({
      csrfToken: "cookie-secret",
      accessToken: "local-secret",
    })
  })

  it("caches newly resolved cacheable secrets", async () => {
    browserStorageLocalMock.getItem.mockResolvedValue(undefined)

    await expect(resolveSourceSecrets({
      secrets: [
        {
          key: "csrfToken",
          type: "cookie",
          origin: "https://x.com",
          itemKey: "ct0",
        },
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "token",
        },
        {
          key: "deviceId",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "device",
          cache: false,
        },
      ],
    }, "x")).resolves.toEqual({
      csrfToken: "cookie-secret",
      accessToken: "local-secret",
      deviceId: "device-secret",
    })

    expect(browserStorageLocalMock.setItem).toHaveBeenCalledWith("local:newsnext_source_secrets", {
      x: {
        csrfToken: "cookie-secret",
        accessToken: "local-secret",
      },
    })
  })

  it("caches newly resolved secrets without replacing existing providers", async () => {
    browserStorageLocalMock.getItem
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        jike: {
          accessToken: "vars-access-token",
          refreshToken: "vars-refresh-token",
        },
      })

    await resolveSourceSecrets({
      secrets: [
        {
          key: "csrfToken",
          type: "cookie",
          origin: "https://x.com",
          itemKey: "ct0",
        },
      ],
    }, "x")

    expect(browserStorageLocalMock.setItem).toHaveBeenCalledWith("local:newsnext_source_secrets", {
      jike: {
        accessToken: "vars-access-token",
        refreshToken: "vars-refresh-token",
      },
      x: {
        csrfToken: "cookie-secret",
      },
    })
  })

  it("requires login when a default-required secret cannot be resolved", async () => {
    browserStorageLocalMock.getItem.mockResolvedValueOnce(undefined)
    browserMock.tabs.query.mockResolvedValueOnce([])

    const promise = resolveSourceSecrets({
      secrets: [
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "token",
        },
      ],
    })

    await expect(promise).rejects.toBeInstanceOf(SourceLoginRequiredError)
    await expect(promise).rejects.toMatchObject({
      code: "SOURCE_LOGIN_REQUIRED",
      loginUrl: "https://web.okjike.com",
    })
  })

  it("allows missing optional secrets", async () => {
    browserStorageLocalMock.getItem.mockResolvedValueOnce(undefined)
    browserMock.tabs.query.mockResolvedValueOnce([])

    await expect(resolveSourceSecrets({
      secrets: [
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "token",
          required: false,
        },
      ],
    })).resolves.toEqual({
      accessToken: undefined,
    })
  })

  it("updates cacheable declared secrets in extension storage", async () => {
    await updateSourceSecrets({
      secrets: [
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "token",
          cache: true,
        },
        {
          key: "deviceId",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "device",
          cache: false,
        },
      ],
    }, "jike", {
      accessToken: " fresh-access-token ",
      deviceId: "new-device-id",
      undeclared: "ignored",
    })

    expect(browserStorageLocalMock.setItem).toHaveBeenCalledWith("local:newsnext_source_secrets", {
      jike: {
        accessToken: "fresh-access-token",
        refreshToken: "vars-refresh-token",
      },
    })
  })
})
