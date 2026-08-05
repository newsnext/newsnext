import { describe, expect, it } from "vitest"
import {
  extractLineArtPixels,
  MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH,
  normalizeBackgroundArtwork,
} from "./background-artwork"

describe("background artwork", () => {
  it("keeps only bounded WebP data URLs", () => {
    expect(normalizeBackgroundArtwork("data:image/webp;base64,AAAA")).toBe("data:image/webp;base64,AAAA")
    expect(normalizeBackgroundArtwork("data:image/png;base64,AAAA")).toBeNull()
    expect(normalizeBackgroundArtwork("data:image/webp;base64,AAAA\");color:red")).toBeNull()
    expect(normalizeBackgroundArtwork(`data:image/webp;base64,${"A".repeat(MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH)}`)).toBeNull()
  })

  it("turns a strong luminance boundary into transparent line art", () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4)
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const index = (y * 5 + x) * 4
        const value = x < 2 ? 0 : 255
        pixels[index] = value
        pixels[index + 1] = value
        pixels[index + 2] = value
        pixels[index + 3] = 255
      }
    }

    const output = extractLineArtPixels(pixels, 5, 5, 20)
    expect(output[(2 * 5 + 2) * 4 + 3]).toBeGreaterThan(0)
    expect(output[(2 * 5 + 3) * 4 + 3]).toBe(0)
  })
})
