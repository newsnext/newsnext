import type { SourceDescriptor } from "@newsnext/source/types"
import type { RegistryValidationResult } from "../registry-settings"
import {
  configureSourceRegistryLoader,
  loadSourceDescriptors,
} from "@newsnext/source/runtime"
import { loadConfiguredSourceRegistry } from "../registry-settings"
import { updateSourceRegistries } from "./registry"

export interface BackgroundRegistryService {
  list: () => Promise<SourceDescriptor[]>
  refresh: () => Promise<SourceDescriptor[]>
  update: () => Promise<RegistryValidationResult[]>
}

export function createBackgroundRegistryService(): BackgroundRegistryService {
  return {
    list: loadSourceDescriptors,
    refresh: async () => {
      configureSourceRegistryLoader(loadConfiguredSourceRegistry)
      return loadSourceDescriptors()
    },
    update: updateSourceRegistries,
  }
}
