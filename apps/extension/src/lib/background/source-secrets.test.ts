import { beforeEach, describe, expect, it, vi } from "vitest"
import { resolveSourceSecrets } from "./source-secrets"

describe("source secrets", () => {
  const localStorageValues: Record<string, string> = {
    token: "local-secret",
    refresh: "refresh-secret",
    device: "device-secret",
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    Object.assign(globalThis, {
      chrome: {
        cookies: {
          get: vi.fn((_details, callback) => {
            callback?.({ value: "cookie-secret" })
          }),
        },
        runtime: {},
        storage: {
          local: {
            get: vi.fn((key, callback) => {
              callback?.({
                [key as string]: JSON.stringify({
                  jike: {
                    accessToken: "vars-access-token",
                    refreshToken: "vars-refresh-token",
                  },
                }),
              })
            }),
          },
        },
        scripting: {
          executeScript: vi.fn((injection, callback) => {
            const [key] = (injection as { args?: unknown[] }).args ?? []
            callback?.([{ result: typeof key === "string" ? ` ${localStorageValues[key] ?? ""} ` : undefined }])
          }),
        },
        tabs: {
          query: vi.fn((_queryInfo, callback) => {
            callback?.([{ id: 7 }])
          }),
        },
      },
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

    expect(globalThis.chrome.scripting.executeScript).not.toHaveBeenCalled()
  })

  it("resolves cookie and localStorage secrets", async () => {
    await expect(resolveSourceSecrets({
      secrets: [
        {
          key: "csrfToken",
          type: "cookie",
          url: "https://x.com",
          name: "ct0",
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

  it("refreshes a declared secret through an HTTP request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: {
          "x-access-token": "fresh-access-token",
        },
      }),
    )

    await expect(resolveSourceSecrets({
      secrets: [
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://example.com",
          itemKey: "token",
        },
        {
          key: "refreshToken",
          type: "localStorage",
          origin: "https://example.com",
          itemKey: "refresh",
        },
        {
          key: "deviceId",
          type: "localStorage",
          origin: "https://example.com",
          itemKey: "device",
        },
      ],
      secretTransforms: [
        {
          type: "http",
          targetKey: "accessToken",
          url: "https://example.com/auth.refresh",
          method: "POST",
          credentials: "include",
          request: secrets => ({
            headers: {
              "content-type": "application/json",
              "x-refresh-token": `${secrets.refreshToken}`,
              "x-device-id": `${secrets.deviceId}`,
            },
            body: {},
          }),
          output: {
            type: "header",
            key: "x-access-token",
          },
          when: "always",
        },
      ],
    })).resolves.toMatchObject({
      accessToken: "fresh-access-token",
      refreshToken: "refresh-secret",
      deviceId: "device-secret",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/auth.refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-refresh-token": "refresh-secret",
          "x-device-id": "device-secret",
        },
        body: "{}",
      }),
    )
  })
})
