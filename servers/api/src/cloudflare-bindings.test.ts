import { afterEach, describe, expect, it } from "vitest"
import { getCloudflareBindings } from "./cloudflare-bindings"

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

describe("getCloudflareBindings", () => {
  it("prefers Nitro request runtime bindings", () => {
    const request = new Request("https://api.newsnext.test") as RequestWithRuntime
    const runtimeBindings = { DATA_DB: {} }
    request.runtime = {
      cloudflare: {
        env: runtimeBindings,
      },
    }

    expect(getCloudflareBindings({ CACHE_DB: {} }, request)).toBe(runtimeBindings)
  })

  it("falls back to Cloudflare global env", () => {
    const request = new Request("https://api.newsnext.test")
    const globalBindings = { DATA_DB: {} }
    globalWithCloudflareEnv.__env__ = globalBindings

    expect(getCloudflareBindings(undefined, request)).toBe(globalBindings)
  })

  it("accepts partial deployment bindings", () => {
    const request = new Request("https://api.newsnext.test")
    const deploymentBindings = { NEWSNEXT_INSTANCE_URL: "https://instance.newsnext.test" }

    expect(getCloudflareBindings(deploymentBindings, request)).toBe(deploymentBindings)
  })
})
