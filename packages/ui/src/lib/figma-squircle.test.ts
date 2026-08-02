import { describe, expect, it } from "vitest"
import { getSvgPath } from "./figma-squircle"

describe("getSvgPath", () => {
  it("matches the upstream path for a rounded rectangle", () => {
    expect(getSvgPath({
      width: 100,
      height: 50,
      cornerRadius: 10,
    })).toBe("M 82 0 c 7.4995 0 11.2492 0 13.8779 1.9098 a 10.0000 10.0000 0 0 1 2.2123 2.2123 c 1.9098 2.6287 1.9098 6.3784 1.9098 13.8779 L 100 32 c 0 7.4995 0 11.2492 -1.9098 13.8779 a 10.0000 10.0000 0 0 1 -2.2123 2.2123 c -2.6287 1.9098 -6.3784 1.9098 -13.8779 1.9098 L 18 50 c -7.4995 0 -11.2492 0 -13.8779 -1.9098 a 10.0000 10.0000 0 0 1 -2.2123 -2.2123 c -1.9098 -2.6287 -1.9098 -6.3784 -1.9098 -13.8779 L 0 18 c 0 -7.4995 0 -11.2492 1.9098 -13.8779 a 10.0000 10.0000 0 0 1 2.2123 -2.2123 c 2.6287 -1.9098 6.3784 -1.9098 13.8779 -1.9098 Z")
  })

  it("clamps oversized uniform radii to half the shortest side", () => {
    const base = {
      width: 100,
      height: 50,
    }

    expect(getSvgPath({ ...base, cornerRadius: 9999 })).toBe(
      getSvgPath({ ...base, cornerRadius: 25 }),
    )
  })

  it("supports square corners", () => {
    expect(getSvgPath({
      width: 100,
      height: 50,
      cornerRadius: 0,
    })).toBe("M 100 0 l 0.0000 0 L 100 50 l 0 0.0000 L 0 50 l 0.0000 0 L 0 0 l 0 0.0000 Z")
  })
})
