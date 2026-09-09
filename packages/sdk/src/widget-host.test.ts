import { describe, expect, it } from "vitest"
import { isWidgetSdkControl, isWidgetSdkRequest } from "./widget-host.js"

describe("widget SDK messages", () => {
  it("accepts SDK envelopes without confusing them with snapshot messages", () => {
    expect(isWidgetSdkRequest({ type: "newsnext.widget.sdk", version: 1, request: { version: 1, method: "status" } })).toBe(true)
    for (const value of [
      null,
      { type: "newsnext.widget.ready", version: 1 },
      { type: "newsnext.widget.data", version: 1, request: {} },
      { type: "newsnext.widget.sdk", version: 2, request: {} },
      { type: "newsnext.widget.sdk", version: 1, request: [] },
      { type: "newsnext.widget.sdk", version: 1, request: null },
    ]) {
      expect(isWidgetSdkRequest(value)).toBe(false)
    }
  })

  it("rejects data and start envelopes on a stream control port", () => {
    expect(isWidgetSdkControl({ type: "next" })).toBe(true)
    expect(isWidgetSdkControl({ type: "cancel" })).toBe(true)
    for (const value of [null, [], "next", {}, { type: "data" }, { type: "newsnext.widget.sdk", request: {} }]) {
      expect(isWidgetSdkControl(value)).toBe(false)
    }
  })
})
