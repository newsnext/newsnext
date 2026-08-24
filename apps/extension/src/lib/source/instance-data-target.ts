import type { RuntimeSource } from "@newsnext/source-kit/types"
import type { Instance } from "./live-cards"
import type { SourceQueryTarget } from "./query-target"
import { createSourceQueryTarget } from "./query-target"

export interface InstanceDataTarget extends SourceQueryTarget {
  instanceId: string
}

export interface InstanceDataSource {
  id: string
  params?: RuntimeSource["params"]
  version: number
}

export function createInstanceDataTarget(
  instance: Instance,
  source: Pick<RuntimeSource, "params" | "version">,
): InstanceDataTarget {
  return {
    instanceId: instance.instanceId,
    ...createSourceQueryTarget(instance.sourceId, source, instance.patch.params, instance.instanceId),
  }
}

export function resolveInstanceDataTarget(
  instances: readonly Instance[],
  sources: readonly InstanceDataSource[],
  instanceId: string,
): InstanceDataTarget {
  const instance = instances.find(candidate => candidate.instanceId === instanceId)
  if (!instance) {
    throw new Error(`Instance '${instanceId}' not found`)
  }
  const source = sources.find(candidate => candidate.id === instance.sourceId)
  if (!source) {
    throw new Error(`Source '${instance.sourceId}' not found`)
  }
  return createInstanceDataTarget(instance, source)
}
