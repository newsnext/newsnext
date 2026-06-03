import type { H3Event } from "nitro"
import { afterEach, describe, expect, it } from "vitest"
import { getNitroCloudflareEnv, getNitroCloudflareEnvValue } from "./cloudflare-bindings"

interface GlobalWithCloudflareEnv {
  __env__?: Record<string, unknown>
}

interface RequestWithRuntime extends Request {
  runtime?: {
    cloudflare?: {
      env?: Record<string, unknown>
    }
  }
}

const globalWithCloudflareEnv = globalThis as GlobalWithCloudflareEnv

afterEach(() => {
  delete globalWithCloudflareEnv.__env__
})

describe("getNitroCloudflareEnv", () => {
  it("reads Cloudflare bindings from the Nitro request runtime", () => {
    const request = new Request("https://api.newsnext.test") as RequestWithRuntime
    const runtimeBindings = { DATA_DB: {} }
    request.runtime = {
      cloudflare: {
        env: runtimeBindings,
      },
    }

    expect(getNitroCloudflareEnv(createEvent(request))).toBe(runtimeBindings)
  })

  it("does not read Cloudflare global env fallbacks", () => {
    const request = new Request("https://api.newsnext.test")
    globalWithCloudflareEnv.__env__ = { DATA_DB: {} }

    expect(getNitroCloudflareEnv(createEvent(request))).toBeUndefined()
  })

  it("returns undefined outside the Cloudflare runtime", () => {
    const request = new Request("https://api.newsnext.test")

    expect(getNitroCloudflareEnv(createEvent(request))).toBeUndefined()
  })

  it("reads string env values from Cloudflare bindings", () => {
    expect(getNitroCloudflareEnvValue({ BETTER_AUTH_URL: "https://api.newsnext.test" }, "BETTER_AUTH_URL"))
      .toBe("https://api.newsnext.test")
    expect(getNitroCloudflareEnvValue({ DATA_DB: {} as D1Database }, "DATA_DB")).toBeUndefined()
  })
})

function createEvent(request: Request): H3Event {
  return { req: request } as H3Event
}
