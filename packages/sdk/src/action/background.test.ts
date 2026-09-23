import Value from "typebox/value"
import { describe, expect, it } from "vitest"
import { backgroundActionContracts } from "./background.js"

const getStatus = backgroundActionContracts.find(contract => contract.name === "nativeIntegration.getStatus")
if (!getStatus) throw new Error("nativeIntegration.getStatus contract is missing")

const getWidgets = backgroundActionContracts.find(contract => contract.name === "nativeIntegration.getWidgets")
if (!getWidgets) throw new Error("nativeIntegration.getWidgets contract is missing")

function status(): Record<string, unknown> {
  return {
    capabilities: [],
    offlineWorkers: [],
    state: "connected",
    workerId: "worker-1",
  }
}

const entry = {
  color: "slate",
  dataFiles: [],
  dataRevision: "rev",
  hasData: true,
  height: 2,
  id: "plain",
  minHeight: 1,
  minWidth: 1,
  params: {},
  refreshIntervalMs: 300_000,
  title: "Plain",
  url: "http://127.0.0.1:43121/widgets/plain/index.html",
  viewRevision: "rev",
  width: 2,
}

describe("nativeIntegration.getStatus result", () => {
  it("carries no Widget catalog", () => {
    expect(() => Value.Parse(getStatus.result, status())).not.toThrow()
    expect(() => Value.Parse(getStatus.result, { ...status(), widgets: [entry] })).toThrow()
  })
})

describe("nativeIntegration.getWidgets result", () => {
  it("accepts custom entries without a view and built-in entries with a preset", () => {
    expect(() => Value.Parse(getWidgets.result, [{ ...entry, hasData: false }])).not.toThrow()
    const { url: _url, ...builtin } = entry
    expect(() => Value.Parse(getWidgets.result, [{ ...builtin, view: { preset: "live-card", query: "feed" } }])).not.toThrow()
  })

  it("rejects catalog entries without the data flag and view revision", () => {
    const { hasData: _hasData, viewRevision: _viewRevision, ...stripped } = entry
    expect(() => Value.Parse(getWidgets.result, [stripped])).toThrow()
  })
})
