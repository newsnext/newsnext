import type { NativeIntegrationServices } from "./action-context"
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
  nativeServices: NativeIntegrationServices,
): BackgroundActionService {
  const actionContext = createBackgroundActionContext(nativeServices)

  return {
    async execute<Name extends UiActionName>(
      name: Name,
      input: UiActionParams<Name>,
    ): Promise<UiActionResult<Name>> {
      return await executeRegisteredAction(name, input, "ui", actionContext) as UiActionResult<Name>
    },
  }
}
