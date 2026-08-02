import { describe, expect, it } from "vitest"
import { resolveSquircleRendering, resolveSquircleStyle } from "./use-squircle"

describe("resolveSquircleRendering", () => {
  it("uses shape geometry by default", () => {
    expect(resolveSquircleRendering("shape")).toBe("shape")
  })

  it("skips shape geometry when border-radius fallback is enabled", () => {
    expect(resolveSquircleRendering("shape", "border-radius")).toBe("round")
  })

  it("preserves native continuous corners regardless of fallback", () => {
    expect(resolveSquircleRendering("corner-shape", "border-radius")).toBe("corner-shape")
  })
})

describe("resolveSquircleStyle", () => {
  it("uses doubled radii with native continuous corners", () => {
    expect(resolveSquircleStyle(24, "corner-shape")).toEqual({
      borderRadius: 48,
      cornerShape: "squircle",
    })
  })

  it("uses a generated shape when clip-path shape syntax is supported", () => {
    expect(resolveSquircleStyle(24, "shape")).toMatchObject({
      borderRadius: 24,
      clipPath: expect.stringMatching(/^shape\(/),
    })
  })

  it("falls back to a standard rounded corner", () => {
    expect(resolveSquircleStyle(24, "round")).toEqual({ borderRadius: 24 })
  })
})
