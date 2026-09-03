import type { NativeIntegrationActions } from "./action-context"
import type {
  UiActionName,
  UiActionParams,
  UiActionResult,
} from "./action-registry"
import { createBackgroundActionContext } from "./action-context"
import { executeRegisteredAction } from "./action-registry"

export interface BackgroundActionService {
  execute: <Name extends UiActionName>(
    name: Name,
    input: UiActionParams<Name>,
  ) => Promise<UiActionResult<Name>>
}

export function createBackgroundActionService(
  nativeIntegration: NativeIntegrationActions,
): BackgroundActionService {
  const actionContext = createBackgroundActionContext(nativeIntegration)

  return {
    async execute<Name extends UiActionName>(
      name: Name,
      input: UiActionParams<Name>,
    ): Promise<UiActionResult<Name>> {
      return await executeRegisteredAction(name, input, "ui", actionContext) as UiActionResult<Name>
    },
  }
}
