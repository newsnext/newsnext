import type {
  UiActionName,
  UiActionParams,
  UiActionResult,
} from "./action-registry"
import { createBackgroundActionContext } from "./action-context"
import { executeRegisteredAction } from "./action-registry"
import {
  getSourceConnectionStatus,
  requestInstanceCache,
  requestInstanceLoad,
  requestWidgetSnapshot,
  setDesktopConnectionEnabled,
} from "./source-connection-native"

const actionContext = createBackgroundActionContext({
  getStatus: async () => getSourceConnectionStatus(),
  getWidgetSnapshot: requestWidgetSnapshot,
  loadInstance: requestInstanceLoad,
  readInstanceCache: requestInstanceCache,
  setEnabled: async ({ enabled }) => (
    await setDesktopConnectionEnabled(enabled)
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
