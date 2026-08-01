import type { SourceFetch } from "@newsnext/source/types"
import { assertNetworkCapability } from "@newsnext/source/core"
import { createSourceFetch } from "@newsnext/source/utils"

export function createBackgroundSourceFetch(
  sourceId: string,
  declaredHosts: readonly string[],
  signal: AbortSignal,
): SourceFetch {
  return createSourceFetch(
    signal,
    url => assertNetworkCapability(sourceId, url, declaredHosts),
  )
}
