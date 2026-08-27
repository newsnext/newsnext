import type {
  UiActionName,
  UiActionParams,
  UiActionResult,
} from "./action-registry"
import { createBackgroundActionContext } from "./action-context"
import { executeRegisteredAction } from "./action-registry"
import {
  getAppIntegrationStatus,
  requestInstanceCache,
  requestInstanceLoad,
  requestWidgetSnapshot,
  setAppIntegrationEnabled,
  setAppIntegrationWorker,
} from "./app-integration-native"

const actionContext = createBackgroundActionContext({
  getStatus: async () => getAppIntegrationStatus(),
  getWidgetSnapshot: requestWidgetSnapshot,
  loadInstance: requestInstanceLoad,
  readInstanceCache: requestInstanceCache,
  setEnabled: async ({ enabled }) => (
    await setAppIntegrationEnabled(enabled)
  ),
  setWorker: async ({ workerId }) => (
    await setAppIntegrationWorker(workerId)
  ),
})

export interface BackgroundActionService {
  execute: <Name extends UiActionName>(
    name: Name,
    input: UiActionParams<Name>,
  ) => Promise<UiActionResult<Name>>
}

export function createBackgroundActionService(): BackgroundActionService {
  return {
    async execute<Name extends UiActionName>(
      name: Name,
      input: UiActionParams<Name>,
    ): Promise<UiActionResult<Name>> {
      return await executeRegisteredAction(name, input, "ui", actionContext) as UiActionResult<Name>
    },
  }
}
