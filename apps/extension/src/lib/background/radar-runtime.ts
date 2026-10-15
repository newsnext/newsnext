import type { SourceDescriptor } from "@newsnext/sdk/models"
import type { RadarMatcher } from "@/lib/radar"
import { getSourceCatalogRevision, loadSourceDescriptors } from "@newsnext/sdk/source/runtime"
import { createRadarMatcher } from "@/lib/radar"

export interface RadarRuntime {
  matcher: RadarMatcher
  sourceDescriptorsById: ReadonlyMap<string, SourceDescriptor>
}

let radarRuntimePromise: Promise<RadarRuntime> | undefined
let radarRuntimeRevision = -1

export function loadRadarRuntime(): Promise<RadarRuntime> {
  const revision = getSourceCatalogRevision()
  if (radarRuntimeRevision !== revision) {
    radarRuntimeRevision = revision
    radarRuntimePromise = undefined
  }
  radarRuntimePromise ??= loadSourceDescriptors().then(sourceDescriptors => ({
    matcher: createRadarMatcher(sourceDescriptors),
    sourceDescriptorsById: new Map(sourceDescriptors.map(source => [source.id, source])),
  })).catch((error) => {
    if (radarRuntimeRevision === revision) radarRuntimePromise = undefined
    throw error
  })

  return radarRuntimePromise
}
