import { describe, expect, it } from "vitest"
import { normalizeNodes } from "./node"

describe("nodes", () => {
  it("normalizes each Node's Loader Instances", () => {
    expect(normalizeNodes([{
      id: "chrome-personal",
      browser: "chrome",
      extensionVersion: "1.0.0",
      instances: [{
        createdAt: 1,
        instanceId: "notifications",
        patch: { params: { inbox: "personal" } },
        sourceId: "github:notifications",
      }],
    }])).toEqual([{
      id: "chrome-personal",
      browser: "chrome",
      extensionVersion: "1.0.0",
      instances: [{
        createdAt: 1,
        instanceId: "notifications",
        patch: { params: { inbox: "personal" } },
        sourceId: "github:notifications",
      }],
    }])
  })
})
