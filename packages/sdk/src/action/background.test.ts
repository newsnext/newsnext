import Value from "typebox/value"
import { describe, expect, it } from "vitest"
import { backgroundActionContracts } from "./background.js"

const getStatus = backgroundActionContracts.find(contract => contract.name === "nativeIntegration.getStatus")
if (!getStatus) throw new Error("nativeIntegration.getStatus contract is missing")

function statusWith(entry: Record<string, unknown>): Record<string, unknown> {
  return {
    capabilities: [],
    offlineWorkers: [],
    state: "connected",
    widgets: [entry],
    workerId: "worker-1",
  }
}

const entry = {
  color: "slate",
  dataFiles: [],
  dataRevision: "rev",
  height: 2,
  id: "plain",
  minHeight: 1,
  minWidth: 1,
  params: {},
  refreshIntervalMs: 300_000,
  title: "Plain",
  view: { type: "custom" },
  width: 2,
}

describe("nativeIntegration.getStatus result", () => {
  it("accepts catalog entries with the hasData flag", () => {
    expect(() => Value.Parse(getStatus.result, statusWith({ ...entry, hasData: false }))).not.toThrow()
  })

  it("accepts catalog entries from daemons without the hasData flag", () => {
    expect(() => Value.Parse(getStatus.result, statusWith(entry))).not.toThrow()
  })
})
