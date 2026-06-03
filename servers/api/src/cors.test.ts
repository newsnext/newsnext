import { describe, expect, it } from "vitest"
import { CORS_ALLOW_HEADERS } from "../middleware/01-cors"

describe("CORS headers", () => {
  it("allows tRPC preflight headers", () => {
    expect(CORS_ALLOW_HEADERS).toContain("trpc-accept")
    expect(CORS_ALLOW_HEADERS).toContain("x-trpc-source")
  })
})
