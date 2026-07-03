import { beforeEach, describe, expect, it, vi } from "vitest"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"

const { browserMock } = vi.hoisted(() => ({
  browserMock: {
    cookies: {
      get: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
    scripting: {
      executeScript: vi.fn(),
    },
    tabs: {
      query: vi.fn(),
    },
  },
}))

vi.mock("wxt/browser", () => ({
  browser: browserMock,
}))

describe("source secrets", () => {
  const localStorageValues: Record<string, string> = {
    token: "local-secret",
    refresh: "refresh-secret",
    device: "device-secret",
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    browserMock.cookies.get.mockResolvedValue({ value: "cookie-secret" })
    browserMock.storage.local.set.mockResolvedValue(undefined)
    browserMock.storage.local.get.mockImplementation(async (key: string) => ({
      [key]: JSON.stringify({
        jike: {
          accessToken: "vars-access-token",
          refreshToken: "vars-refresh-token",
        },
      }),
    }))
    browserMock.scripting.executeScript.mockImplementation(async (injection: { args?: unknown[] }) => {
      const [key] = injection.args ?? []
      return [{ result: typeof key === "string" ? ` ${localStorageValues[key] ?? ""} ` : undefined }]
    })
    browserMock.tabs.query.mockResolvedValue([{ id: 7 }])
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
  })

  it("resolves cookie secrets from extension cache before reading cookies", async () => {
    browserMock.storage.local.get.mockImplementationOnce(async (key: string) => ({
      [key]: JSON.stringify({
        jike: {
          csrfToken: "cached-cookie-secret",
        },
      }),
    }))

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

    expect(browserMock.storage.local.set).toHaveBeenCalledWith({
      newsnext_source_secrets: JSON.stringify({
        jike: {
          accessToken: "fresh-access-token",
          refreshToken: "vars-refresh-token",
        },
      }),
    })
  })
})
