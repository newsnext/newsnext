import type { SourceDescriptor } from "@newsnext/source/types"
import type { RegistryValidationResult } from "../registry-settings"
import {
  configureExternalSourcesLoader,
  loadSourceDescriptors,
} from "@newsnext/source/runtime"
import { loadConfiguredSources, updateSourceRegistries } from "./registry"

export interface BackgroundRegistryService {
  list: () => Promise<SourceDescriptor[]>
  refresh: () => Promise<SourceDescriptor[]>
  update: () => Promise<RegistryValidationResult[]>
}

export function createBackgroundRegistryService(): BackgroundRegistryService {
  return {
    list: loadSourceDescriptors,
    refresh: async () => {
      configureExternalSourcesLoader(loadConfiguredSources)
      return loadSourceDescriptors()
    },
    update: updateSourceRegistries,
  }
}
