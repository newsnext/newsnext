import { describe, expect, it } from "vitest"
import {
  MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH,
  normalizeBackgroundArtwork,
} from "./background-artwork-config"
import {
  bridgeEdgeGaps,
  createLineArtSvg,
  extractLineArtPixels,
  selectConnectedEdges,
  traceEdgePaths,
} from "./background-artwork-processing"

describe("background artwork", () => {
  it("keeps only bounded generated artwork data URLs", () => {
    expect(normalizeBackgroundArtwork("data:image/webp;base64,AAAA")).toBe("data:image/webp;base64,AAAA")
    expect(normalizeBackgroundArtwork("data:image/svg+xml;base64,AAAA")).toBe("data:image/svg+xml;base64,AAAA")
    expect(normalizeBackgroundArtwork("data:image/png;base64,AAAA")).toBeNull()
    expect(normalizeBackgroundArtwork("data:image/webp;base64,AAAA\");color:red")).toBeNull()
    expect(normalizeBackgroundArtwork(`data:image/webp;base64,${"A".repeat(MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH)}`)).toBeNull()
  })

  it("turns a luminance boundary into brighter graded WebP line art pixels", () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4)
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const index = (y * 5 + x) * 4
        const value = x < 2 ? 0 : 40
        pixels[index] = value
        pixels[index + 1] = value
        pixels[index + 2] = value
        pixels[index + 3] = 255
      }
    }

    const output = extractLineArtPixels(pixels, 5, 5, 20)
    expect(output[(2 * 5 + 1) * 4 + 3]).toBeGreaterThan(0)
    expect(output[(2 * 5 + 1) * 4 + 3]).toBeLessThan(255)
    expect(output[(2 * 5 + 2) * 4 + 3]).toBeGreaterThan(0)
    expect(output[(2 * 5 + 2) * 4 + 3]).toBeLessThan(255)
    expect(output[(2 * 5 + 3) * 4 + 3]).toBe(0)
  })

  it("keeps weak edges only when they connect to a strong edge", () => {
    const magnitude = new Float32Array(5 * 3)
    magnitude[1 * 5 + 1] = 50
    magnitude[1 * 5 + 2] = 20
    magnitude[1 * 5 + 4] = 20

    const selected = selectConnectedEdges(magnitude, 5, 3, 40)
    expect(selected[1 * 5 + 1]).toBe(1)
    expect(selected[1 * 5 + 2]).toBe(1)
    expect(selected[1 * 5 + 4]).toBe(0)
  })

  it("connects and simplifies edge pixels into scalable SVG paths", () => {
    const edges = new Uint8Array(6 * 4)
    edges[1 * 6 + 1] = 1
    edges[1 * 6 + 2] = 1
    edges[1 * 6 + 3] = 1
    edges[2 * 6 + 4] = 1

    expect(traceEdgePaths(edges, 6, 4)).toEqual([[
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 2 },
    ]])
    const svg = createLineArtSvg(edges, 6, 4)
    expect(svg).toContain("d=\"M1 1L3 1L4 2\"")
    expect(svg).toContain("stroke-linejoin=\"round\"")
  })

  it("bridges short gaps only when endpoint directions align", () => {
    const edges = new Uint8Array(8 * 5)
    edges[2 * 8 + 1] = 1
    edges[2 * 8 + 2] = 1
    edges[2 * 8 + 5] = 1
    edges[2 * 8 + 6] = 1
    edges[4 * 8 + 2] = 1

    const bridged = bridgeEdgeGaps(edges, 8, 5)
    expect(bridged[2 * 8 + 3]).toBe(1)
    expect(bridged[2 * 8 + 4]).toBe(1)
    expect(bridged[4 * 8 + 3]).toBe(0)
  })
})
