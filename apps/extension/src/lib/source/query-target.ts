import type { RuntimeSource } from "@newsnext/source-kit/types"
import { normalizeSourceParams } from "@newsnext/source-kit/runtime"

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
