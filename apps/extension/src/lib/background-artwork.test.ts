import { describe, expect, it } from "vitest"
import {
  MAX_BACKGROUND_ARTWORK_DATA_URL_LENGTH,
  normalizeBackgroundArtwork,
} from "./background-artwork-config"
import {
  readGeneratedSvgAspectRatio,
  resolveBackgroundArtworkCenter,
  resolveBackgroundArtworkLayout,
  resolveBackgroundArtworkTranslation,
} from "./background-artwork-layout"
import {
  bridgeEdgeGaps,
  cleanAndCropLineArtPixels,
  createLineArtSvg,
  extractLineArtPixels,
  removeSmallEdgeComponents,
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

  it("resolves the generated artwork's visible bounds", () => {
    const svg = btoa(`<svg viewBox="0 0 800 400"></svg>`)
    expect(readGeneratedSvgAspectRatio(`data:image/svg+xml;base64,${svg}`)).toBe(2)
    const layout = resolveBackgroundArtworkLayout(1000, 500, 2)
    expect(layout).toEqual({
      height: 484,
      left: 82,
      top: 80,
      width: 968,
    })
    expect(resolveBackgroundArtworkTranslation(layout, 1000, 500, 50, 50)).toEqual({
      x: -66,
      y: -72,
    })
    expect(resolveBackgroundArtworkCenter(layout, 500, {
      positionMode: "bottom-center",
      x: 50,
      y: 100,
      scale: 1,
      rotation: 0,
    })).toEqual({
      x: 50,
      y: 51.6,
    })
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
    const edges = new Uint8Array(12 * 10)
    edges[5 * 12 + 5] = 1
    edges[5 * 12 + 6] = 1
    edges[5 * 12 + 7] = 1
    edges[5 * 12 + 8] = 1
    edges[6 * 12 + 9] = 1
    edges[7 * 12 + 10] = 1

    expect(traceEdgePaths(edges, 12, 10)).toEqual([[
      { x: 5, y: 5 },
      { x: 8, y: 5 },
      { x: 10, y: 7 },
    ]])
    edges[0] = 1
    const svg = createLineArtSvg(edges, 12, 10)
    expect(svg).toContain("viewBox=\"1 1 11 9\"")
    expect(svg).toContain("d=\"M5 5L8 5L10 7\"")
    expect(svg).toContain("stroke-linejoin=\"round\"")
  })

  it("removes isolated points and crops raster line art to the cleaned bounds", () => {
    const width = 16
    const height = 14
    const edges = new Uint8Array(width * height)
    for (let x = 6; x <= 11; x += 1) edges[8 * width + x] = 1
    edges[1 * width + 1] = 1

    const cleaned = removeSmallEdgeComponents(edges, width, height)
    expect(cleaned[1 * width + 1]).toBe(0)
    expect(cleaned[8 * width + 6]).toBe(1)

    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let index = 0; index < edges.length; index += 1) {
      pixels[index * 4 + 3] = edges[index] === 1 ? 200 : 0
    }
    const cropped = cleanAndCropLineArtPixels(pixels, width, height)
    expect(cropped).not.toBeNull()
    expect(cropped && { width: cropped.width, height: cropped.height }).toEqual({
      height: 9,
      width: 14,
    })
    expect(cropped?.pixels[(4 * 14 + 4) * 4 + 3]).toBe(200)
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
