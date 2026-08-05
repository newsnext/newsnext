import { describe, expect, it } from "vitest"
import {
  createSvgIllustrationDataUrl,
  MAX_BG_ILLUSTRATION_DATA_URL_LENGTH,
  normalizeBgIllustration,
} from "./config"
import {
  readSvgIllustrationAspectRatio,
  resolveBgIllustrationCenter,
  resolveBgIllustrationLayout,
  resolveBgIllustrationTranslation,
} from "./layout"
import {
  bridgeEdgeGaps,
  createLineArtSvg,
  removeSmallEdgeComponents,
  selectConnectedEdges,
  traceEdgePaths,
} from "./processing"

describe("background illustration", () => {
  it("keeps only bounded SVG illustration data URLs", () => {
    const svg = "<svg viewBox=\"0 0 8 4\"></svg>"
    const illustration = createSvgIllustrationDataUrl(svg)
    expect(illustration).toBe(`data:image/svg+xml,${encodeURIComponent(svg)}`)
    expect(normalizeBgIllustration(illustration)).toBe(illustration)
    expect(normalizeBgIllustration("data:image/webp;base64,AAAA")).toBeNull()
    expect(normalizeBgIllustration("data:image/svg+xml;base64,AAAA")).toBeNull()
    expect(normalizeBgIllustration("data:image/png;base64,AAAA")).toBeNull()
    expect(normalizeBgIllustration("data:image/svg+xml,<svg></svg>")).toBeNull()
    expect(normalizeBgIllustration(`data:image/svg+xml,${"A".repeat(MAX_BG_ILLUSTRATION_DATA_URL_LENGTH)}`)).toBeNull()
  })

  it("resolves SVG illustration's visible bounds", () => {
    const illustration = createSvgIllustrationDataUrl(`<svg viewBox="0 0 800 400"></svg>`)
    expect(illustration && readSvgIllustrationAspectRatio(illustration)).toBe(2)
    const layout = resolveBgIllustrationLayout(1000, 500, 2)
    expect(layout).toEqual({
      height: 484,
      left: 82,
      top: 80,
      width: 968,
    })
    expect(resolveBgIllustrationTranslation(layout, 1000, 500, 50, 50)).toEqual({
      x: -66,
      y: -72,
    })
    expect(resolveBgIllustrationCenter(layout, 500, {
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

  it("removes isolated edge points", () => {
    const width = 16
    const height = 14
    const edges = new Uint8Array(width * height)
    for (let x = 6; x <= 11; x += 1) edges[8 * width + x] = 1
    edges[1 * width + 1] = 1

    const cleaned = removeSmallEdgeComponents(edges, width, height)
    expect(cleaned[1 * width + 1]).toBe(0)
    expect(cleaned[8 * width + 6]).toBe(1)
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
