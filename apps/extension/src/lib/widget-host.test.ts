import { describe, expect, it } from "vitest"
import { isWidgetSdkControl, isWidgetSdkRequest, isWidgetSize, isWidgetStatus, sdkErrorFrame } from "./widget-host.js"

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

  it("accepts only custom view status reports", () => {
    expect(isWidgetStatus({ type: "newsnext.widget.status", version: 1, message: "No data to display." })).toBe(true)
    expect(isWidgetStatus({ type: "newsnext.widget.status", version: 1, message: null })).toBe(true)
    for (const value of [
      null,
      [],
      "status",
      {},
      { type: "newsnext.widget.status", version: 2, message: null },
      { type: "newsnext.widget.status", version: 1 },
      { type: "newsnext.widget.status", version: 1, message: 3 },
      { type: "newsnext.widget.data", version: 1, message: null },
    ]) {
      expect(isWidgetStatus(value)).toBe(false)
    }
  })

  it("accepts only finite non-negative custom view sizes", () => {
    expect(isWidgetSize({ type: "newsnext.widget.size", version: 1, height: 238 })).toBe(true)
    expect(isWidgetSize({ type: "newsnext.widget.size", version: 1, height: 0 })).toBe(true)
    for (const value of [
      null,
      [],
      "size",
      {},
      { type: "newsnext.widget.size", version: 2, height: 120 },
      { type: "newsnext.widget.size", version: 1 },
      { type: "newsnext.widget.size", version: 1, height: "120" },
      { type: "newsnext.widget.size", version: 1, height: Number.NaN },
      { type: "newsnext.widget.size", version: 1, height: Number.POSITIVE_INFINITY },
      { type: "newsnext.widget.size", version: 1, height: -1 },
      { type: "newsnext.widget.status", version: 1, message: null },
    ]) {
      expect(isWidgetSize(value)).toBe(false)
    }
  })
})

it("preserves domain codes from RPC errors for SDK consumers", () => {
  const error = Object.assign(new Error("Stream cancelled"), { code: -32000, data: { code: "SDK_REQUEST_CANCELLED" } })
  expect(sdkErrorFrame(error)).toEqual({ version: 1, type: "error", error: { code: "SDK_REQUEST_CANCELLED", message: "Stream cancelled" } })
})
