import type {
  ActionParamsOf,
  ActionResultOf,
  AnyActionDefinition,
} from "../action"
import type { BackgroundActionContext } from "./background-actions"
import { defineActionRegistry } from "../action"
import { dispatchBackgroundAction } from "./action-dispatcher"
import {
  applicationActionDefinitions,
} from "./application-actions"
import {
  backgroundActionDefinitions,
  uiBackgroundActionDefinitions,
} from "./background-actions"

export const uiActionDefinitions = [
  ...applicationActionDefinitions,
  ...uiBackgroundActionDefinitions,
] as const

export const actionRegistry = defineActionRegistry([
  ...applicationActionDefinitions,
  ...backgroundActionDefinitions,
] as const)

export async function executeRegisteredAction(
  name: string,
  input: unknown,
  audience: "connected" | "ui",
  context: BackgroundActionContext,
  commandId?: string,
): Promise<unknown> {
  const definition = actionRegistry.get(name)
  if (!definition || !definition.audiences.includes(audience)) {
    throw new Error(`Unknown Action '${name}'`)
  }
  const executable = definition as AnyActionDefinition
  return await dispatchBackgroundAction({
    ...(commandId === undefined ? {} : { commandId }),
    input,
    name,
    origin: audience === "connected" ? "cli" : "ui",
  }, async () => await executable.execute(input, context), {
    input: (value) => {
      const parsed = executable.parse(value)
      return executable.diagnostics?.input
        ? executable.diagnostics.input(parsed)
        : parsed
    },
    ...(executable.diagnostics?.output
      ? { result: executable.diagnostics.output }
      : {}),
  })
}

type UiActionDefinition = typeof uiActionDefinitions[number]
export type UiActionName = UiActionDefinition["name"]
export type UiActionDefinitionFor<Name extends UiActionName> = Extract<UiActionDefinition, { name: Name }>
export type UiActionParams<Name extends UiActionName> = ActionParamsOf<UiActionDefinitionFor<Name>>
export type UiActionResult<Name extends UiActionName> = ActionResultOf<UiActionDefinitionFor<Name>>
