import { describe, expect, it } from "vitest"
import { getAuth } from "./auth"

describe("getAuth", () => {
  it("creates a local auth handler without Cloudflare bindings", async () => {
    const auth = await getAuth()
    const response = await auth.handler(new Request("http://localhost/api/auth/get-session"))

    expect(response.status).toBe(200)
  })

  it("keeps local auth when local runtime receives Cloudflare bindings", async () => {
    const auth = await getAuth({ DATA_DB: {} as D1Database })
    const response = await auth.handler(new Request("http://localhost/api/auth/get-session"))

    expect(response.status).toBe(200)
  })
})
