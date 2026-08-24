import { describe, expect, it } from "vitest"
import { parseLocalWidgetManifests } from "./widget-manifest"

const SERVER_URL = "http://127.0.0.1:43121"
describe("parseLocalWidgetManifests", () => {
  it("accepts widgets served by the declared loopback origin", () => {
    expect(parseLocalWidgetManifests([{
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: `${SERVER_URL}/widgets/headlines/index.html`,
      width: 6,
    }], SERVER_URL)).toHaveLength(1)
  })

  it("rejects entry URLs from another origin", () => {
    expect(() => parseLocalWidgetManifests([{
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: "https://example.com/widgets/headlines/index.html",
      width: 6,
    }], SERVER_URL)).toThrow("invalid entry URL")
  })

  it("rejects duplicate widget IDs", () => {
    const widget = {
      height: 4,
      id: "headlines",
      minHeight: 2,
      minWidth: 2,
      title: "Headlines",
      url: `${SERVER_URL}/widgets/headlines/index.html`,
      width: 6,
    }
    expect(() => parseLocalWidgetManifests([widget, widget], SERVER_URL)).toThrow("Duplicate widget ID")
  })
})
