import type { RuntimeSource } from "@newsnext/source/types"
import { normalizeSourceParams } from "@newsnext/source/runtime"

export interface SourceQueryTarget {
  params: Record<string, unknown>
  sourceId: string
}

export function createSourceQueryTarget(
  sourceId: string,
  source: Pick<RuntimeSource, "params">,
  params: Record<string, unknown> = {},
): SourceQueryTarget {
  return {
    params: normalizeSourceParams(source, params),
    sourceId,
  }
}
