import type { uiActionDefinitions } from "./background/action-registry"
import { createActionsClient } from "./action"
import { createBackgroundClient } from "./background"

const actionService = createBackgroundClient().action

export const actions = createActionsClient<typeof uiActionDefinitions>(async (name, input) => {
  const execute = actionService.execute as (
    actionName: string,
    actionInput: unknown,
  ) => Promise<unknown>
  return await execute(name, input)
})
