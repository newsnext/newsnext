import type { SourceDescriptor } from "@newsnext/source/types"
import { loadSourceDescriptors } from "@newsnext/source/runtime"

export interface BackgroundRegistryService {
  list: () => Promise<SourceDescriptor[]>
}

export function createBackgroundRegistryService(): BackgroundRegistryService {
  return {
    list: loadSourceDescriptors,
  }
}
