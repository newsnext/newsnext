import type { SourceInstance } from "../source"

interface ResolvedInstanceHistoryTarget {
  params?: Record<string, unknown>
  sourceId: string
}

export function resolveInstanceHistoryTarget(
  instances: SourceInstance[],
  instanceId: string,
): ResolvedInstanceHistoryTarget {
  const instance = instances.find(candidate => candidate.instanceId === instanceId)
  if (!instance) {
    throw new Error(`Instance '${instanceId}' not found`)
  }
  return {
    sourceId: instance.sourceId,
    params: instance.patch.params,
  }
}
