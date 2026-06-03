import { describe, expect, it } from "vitest"
import { createSafeProxiedImageHeaders } from "./proxy-headers"

describe("createSafeProxiedImageHeaders", () => {
  it("drops transport headers that must be owned by the server response", () => {
    const headers = createSafeProxiedImageHeaders(new Headers({
      "Access-Control-Allow-Origin": "https://origin.example",
      "Cache-Control": "private",
      "Connection": "keep-alive",
      "Content-Encoding": "gzip",
      "Content-Length": "1234",
      "Content-Type": "image/png",
      "Keep-Alive": "timeout=5",
      "Set-Cookie": "session=abc",
      "Transfer-Encoding": "chunked",
      "Upgrade": "websocket",
    }))

    expect(headers.get("content-length")).toBeNull()
    expect(headers.get("transfer-encoding")).toBeNull()
    expect(headers.get("content-encoding")).toBeNull()
    expect(headers.get("connection")).toBeNull()
    expect(headers.get("keep-alive")).toBeNull()
    expect(headers.get("set-cookie")).toBeNull()
    expect(headers.get("upgrade")).toBeNull()
    expect(headers.get("content-type")).toBe("image/png")
    expect(headers.get("cache-control")).toBe("public, max-age=31536000, immutable")
    expect(headers.get("access-control-allow-origin")).toBe("*")
  })
})
