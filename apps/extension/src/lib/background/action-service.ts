import type {
  ActionInput,
  ActionName,
  ActionResult,
} from "@newsnext/sdk/actions"
import type { BackgroundActionDependencies } from "./action-context"
import { createBackgroundActionContext } from "./action-context"
import { executeRegisteredAction } from "./action-registry"

export interface BackgroundActionService {
  execute: <Name extends ActionName>(
    name: Name,
    input: ActionInput<Name>,
  ) => Promise<ActionResult<Name>>
}

export function createBackgroundActionService(
  dependencies: BackgroundActionDependencies,
): BackgroundActionService {
  const actionContext = createBackgroundActionContext(dependencies)

  return {
    async execute<Name extends ActionName>(
      name: Name,
      input: ActionInput<Name>,
    ): Promise<ActionResult<Name>> {
      return await executeRegisteredAction(name, input, "ui", actionContext) as ActionResult<Name>
    },
  }
}
