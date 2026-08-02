import { describe, expect, it } from "vitest"
import { getCssShape } from "./figma-squircle"

describe("getCssShape", () => {
  it("expresses the same smoothed corner with relative CSS commands", () => {
    const shape = getCssShape(10)

    expect(shape).toContain("shape(from calc(100% - 18.0000px) 0")
    expect(shape).toContain("curve by 13.8779px 1.9098px with 7.4995px 0 from start / 11.2492px 0 from start")
    expect(shape).toContain("arc by 2.2123px 2.2123px of 10.0000px cw")
    expect(shape).toMatch(/close\)$/)
  })

  it("uses an inset for square corners", () => {
    expect(getCssShape(0)).toBe("inset(0)")
  })
})
