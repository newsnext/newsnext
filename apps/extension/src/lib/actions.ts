import type { AllActionContract } from "@newsnext/sdk/actions"
import { createActionsClient } from "@newsnext/sdk/actions"
import { createBackgroundClient } from "./background"

const actionService = createBackgroundClient().action

export const actions = createActionsClient<readonly AllActionContract[]>(async (name, input) => {
  const execute = actionService.execute as (
    actionName: string,
    actionInput: unknown,
  ) => Promise<unknown>
  return await execute(name, input)
})
