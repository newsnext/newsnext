import { describe, expect, it } from "vitest"
import {
  createSvgIllustrationDataUrl,
  DEFAULT_BG_ILLUSTRATION_TRANSFORM,
  MAX_BG_ILLUSTRATION_DATA_URL_LENGTH,
} from "./config"
import {
  readSvgIllustrationAspectRatio,
  resolveBgIllustrationCenter,
  resolveBgIllustrationLayout,
  resolveBgIllustrationTranslation,
} from "./layout"
import { createBgIllustrationId, decodeBgIllustration, encodeBgIllustration } from "./persisted-illustration"
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
    expect(createSvgIllustrationDataUrl("not SVG")).toBeNull()
    expect(createSvgIllustrationDataUrl(`<svg>${" ".repeat(MAX_BG_ILLUSTRATION_DATA_URL_LENGTH)}</svg>`)).toBeNull()
  })

  it("round trips content-addressed illustrations as UTF-8 binary data", async () => {
    const illustration = createSvgIllustrationDataUrl("<svg><text>新闻</text></svg>")
    expect(illustration).not.toBeNull()
    const bytes = illustration && encodeBgIllustration(illustration)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes && new TextDecoder().decode(bytes)).toBe("<svg><text>新闻</text></svg>")
    expect(decodeBgIllustration(bytes)).toBe(illustration)
    expect(decodeBgIllustration("<svg></svg>")).toBeNull()
    if (bytes) {
      expect(await createBgIllustrationId(bytes)).toMatch(/^[a-f\d]{64}$/u)
    }
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
    expect(resolveBgIllustrationCenter(layout, 500, DEFAULT_BG_ILLUSTRATION_TRANSFORM)).toEqual({
      x: 50,
      y: 51.6,
    })
  })

  it("keeps default placement stable in narrow viewports", () => {
    const narrowLayout = resolveBgIllustrationLayout(320, 568, 2)
    const narrowCenter = resolveBgIllustrationCenter(
      narrowLayout,
      568,
      DEFAULT_BG_ILLUSTRATION_TRANSFORM,
    )
    expect(narrowLayout.width).toBe(320)
    expect(resolveBgIllustrationTranslation(
      narrowLayout,
      320,
      568,
      narrowCenter.x,
      narrowCenter.y,
    )).toEqual({ x: -48, y: -64 })
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
