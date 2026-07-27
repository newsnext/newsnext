import type { RuntimeSource } from "@newsnext/source/types"
import type { RegistryValidationResult } from "../registry-settings"
import { resolveSources } from "@newsnext/registry/loaders"
import { configureExternalSourcesLoader } from "@newsnext/source/runtime"
import { browser } from "#imports"
import {
  loadConfiguredSourceRegistry,
  REGISTRY_CACHE_STORAGE_KEY,
  REGISTRY_URLS_STORAGE_KEY,
  updateConfiguredSourceRegistries,
} from "../registry-settings"
import { syncConfiguredSourceRequestRules } from "./source-request-rules"

const REGISTRY_UPDATE_ALARM = "update-source-registries"
const REGISTRY_UPDATE_INTERVAL_MINUTES = 24 * 60

export async function loadConfiguredSources(): Promise<Record<string, RuntimeSource>> {
  return resolveSources(await loadConfiguredSourceRegistry())
}

export async function updateSourceRegistries(): Promise<RegistryValidationResult[]> {
  const results = await updateConfiguredSourceRegistries()
  configureExternalSourcesLoader(loadConfiguredSources)
  await syncConfiguredSourceRequestRules()
  return results
}

export function registerSourceRegistryLoader(): void {
  configureExternalSourcesLoader(loadConfiguredSources)

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName === "local"
      && (
        REGISTRY_URLS_STORAGE_KEY in changes
        || REGISTRY_CACHE_STORAGE_KEY in changes
      )
    ) {
      configureExternalSourcesLoader(loadConfiguredSources)
      void syncConfiguredSourceRequestRules().catch((error) => {
        console.error("Failed to synchronize source request rules", error)
      })
    }
  })

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REGISTRY_UPDATE_ALARM) {
      void updateSourceRegistries().catch((error) => {
        console.error("Failed to update source registries", error)
      })
    }
  })

  void browser.alarms.get(REGISTRY_UPDATE_ALARM).then((alarm) => {
    if (!alarm) {
      browser.alarms.create(REGISTRY_UPDATE_ALARM, {
        delayInMinutes: REGISTRY_UPDATE_INTERVAL_MINUTES,
        periodInMinutes: REGISTRY_UPDATE_INTERVAL_MINUTES,
      })
    }
  })
}
