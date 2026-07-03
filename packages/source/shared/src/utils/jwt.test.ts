import { describe, expect, it } from "vitest"
import { decodeJwtPayload, getJwtExpiration, isJwtExpired } from "./jwt"

function createJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  return `${encode({ alg: "none" })}.${encode(payload)}.signature`
}

describe("jwt utils", () => {
  it("decodes a jwt payload", () => {
    const token = createJwt({
      id: "48356807",
      type: "github",
      exp: 1787839520,
    })

    expect(decodeJwtPayload(token)).toEqual({
      id: "48356807",
      type: "github",
      exp: 1787839520,
    })
    expect(getJwtExpiration(token)).toBe(1787839520)
  })

  it("treats tokens inside the buffer as expired", () => {
    const now = new Date("2026-07-03T10:00:00Z")
    const exp = Math.floor(now.getTime() / 1000) + 30

    expect(isJwtExpired(createJwt({ exp }), {
      now,
      bufferSeconds: 30,
    })).toBe(true)
  })

  it("does not expire tokens without a readable exp", () => {
    expect(isJwtExpired(createJwt({ iat: 1783052388.142 }), {
      now: new Date("2026-07-03T10:00:00Z"),
      bufferSeconds: 30,
    })).toBe(false)
    expect(isJwtExpired("not-a-jwt")).toBe(false)
  })
})
