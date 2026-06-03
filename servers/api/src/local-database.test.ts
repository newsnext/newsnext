import { afterEach, describe, expect, it, vi } from "vitest"

describe("Nitro database config", () => {
  afterEach(() => {
    delete process.env.NITRO_PRESET
    vi.resetModules()
  })

  it("configures Bun and local databases through Nitro", async () => {
    const config = await loadConfig()

    expect(config.experimental?.database).toBe(true)
    expect(config.database?.default?.connector).toBe("bun-sqlite")
    expect(config.database?.default?.options?.path).toMatch(/\/data\/data\.db$/)
    expect(config.database?.default?.options?.path).not.toContain("file:")
    expect(config.devDatabase?.default?.connector).toBe("bun-sqlite")
    expect(config.devDatabase?.default?.options?.path).toMatch(/\/data\/data\.db$/)
    expect(config.devDatabase?.default?.options?.path).not.toContain("file:")
  })

  it("configures Cloudflare database through Nitro", async () => {
    process.env.NITRO_PRESET = "cloudflare-module"
    const cloudflareConfig = await loadConfig()

    expect(cloudflareConfig.database?.default?.connector).toBe("cloudflare-d1")
    expect(cloudflareConfig.database?.default?.options?.bindingName).toBe("DATA_DB")
  })
})

async function loadConfig() {
  vi.resetModules()
  const config = await import("../nitro.config")
  return config.default
}
