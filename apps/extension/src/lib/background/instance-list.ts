import type { SourceInstance } from "../source"
import { browser } from "#imports"
import {
  normalizeSourceInstances,
  PERSISTED_DATA_SLICES,
} from "../settings"

export async function listConnectedInstances(): Promise<SourceInstance[]> {
  const stored = await browser.storage.local.get(PERSISTED_DATA_SLICES.instances.key)
  return normalizeSourceInstances(stored[PERSISTED_DATA_SLICES.instances.key])
}
