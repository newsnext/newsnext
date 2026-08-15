import type { SourceInstance } from "./cards"
import type { InstanceDataSource } from "./instance-data-target"
import { describe, expect, it } from "vitest"
import { createInstanceDataTarget, resolveInstanceDataTarget } from "./instance-data-target"

const source = {
  id: "github:trending",
  params: {
    language: {
      default: "",
      title: "Language",
      type: "text",
    },
    range: {
      default: "daily",
      title: "Range",
      type: "select",
      values: [
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
      ],
    },
  },
} satisfies InstanceDataSource

const instance: SourceInstance = {
  createdAt: 1,
  instanceId: "github:trending::one",
  patch: { params: { language: "typescript" } },
  sourceId: source.id,
}

describe("instance data targets", () => {
  it("combines an Instance with normalized Source parameters", () => {
    expect(createInstanceDataTarget(instance, source)).toEqual({
      instanceId: instance.instanceId,
      params: {
        language: "typescript",
        range: "daily",
      },
      sourceId: source.id,
    })
  })

  it("resolves a target by stable Instance identity", () => {
    expect(resolveInstanceDataTarget([instance], [source], instance.instanceId))
      .toEqual(createInstanceDataTarget(instance, source))
  })

  it("rejects missing Instances and Sources", () => {
    expect(() => resolveInstanceDataTarget([], [source], instance.instanceId))
      .toThrow(`Instance '${instance.instanceId}' not found`)
    expect(() => resolveInstanceDataTarget([instance], [], instance.instanceId))
      .toThrow(`Source '${source.id}' not found`)
  })
})
