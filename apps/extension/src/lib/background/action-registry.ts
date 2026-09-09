import type {
  AnyActionDefinition,
} from "@newsnext/sdk/actions"
import type { BackgroundActionContext } from "./background-actions"
import { defineActionRegistry } from "@newsnext/sdk/actions"
import { dispatchBackgroundAction } from "./action-dispatcher"
import {
  applicationActionDefinitions,
} from "./application-actions"
import {
  backgroundActionDefinitions,
} from "./background-actions"

const actionDefinitions = [
  ...applicationActionDefinitions,
  ...backgroundActionDefinitions,
] as const

export const actionRegistry = defineActionRegistry(actionDefinitions)

export async function executeRegisteredAction(
  name: string,
  input: unknown,
  origin: "connected" | "ui",
  context: BackgroundActionContext,
  commandId?: string,
): Promise<unknown> {
  const definition = actionRegistry.get(name)
  if (!definition) {
    throw new Error(`Unknown Action '${name}'`)
  }
  const executable = definition as AnyActionDefinition
  return await dispatchBackgroundAction({
    ...(commandId === undefined ? {} : { commandId }),
    input,
    name,
    origin: origin === "connected" ? "cli" : "ui",
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
