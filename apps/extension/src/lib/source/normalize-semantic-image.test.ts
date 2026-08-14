import { describe, expect, it } from "vitest"
import { calculateSymmetricImageScale, findSymmetricVerticalInset } from "./normalize-semantic-image"

describe("semantic image normalization", () => {
  it("finds symmetric transparent vertical padding", () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4)
    for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2]] as const) {
      pixels[(y * 4 + x) * 4 + 3] = 255
    }

    expect(findSymmetricVerticalInset(pixels, 4, 4)).toBe(1)
  })

  it("uses the smaller inset when edge pixels are asymmetric", () => {
    const pixels = new Uint8ClampedArray(2 * 4 * 4)
    pixels[(1 * 2) * 4 + 3] = 255
    pixels[(3 * 2) * 4 + 3] = 255

    expect(findSymmetricVerticalInset(pixels, 2, 4)).toBe(0)
  })

  it("reproduces the previous mark scale from its visible content height", () => {
    expect(calculateSymmetricImageScale(15, 72)).toBe(1.5)
  })

  it("does not shrink images that already fill the target height", () => {
    expect(calculateSymmetricImageScale(0, 72)).toBe(1)
  })

  it("ignores fully transparent and near-transparent pixels", () => {
    const pixels = new Uint8ClampedArray(2 * 2 * 4)
    pixels[3] = 16

    expect(findSymmetricVerticalInset(pixels, 2, 2)).toBeUndefined()
  })
})
