import type { Static } from "typebox"
import { applicationActionContracts } from "./application.js"
import { backgroundActionContracts } from "./background.js"

export { applicationActionContracts, backgroundActionContracts }
export { createActionsClient } from "./client.js"
export type { ActionsClient } from "./client.js"
export { defineAction, defineActionContract, defineActionRegistry } from "./definition.js"
export type { ActionContract, ActionDefinition, ActionDescriptor, ActionDiagnostics, ActionKind, ActionParamsOf, ActionRegistry, ActionResultOf, AnyActionDefinition } from "./definition.js"

export const actionContracts = { ...applicationActionContracts, ...backgroundActionContracts } as const
export type AllActionName = keyof typeof actionContracts
export type AllActionContract = typeof actionContracts[AllActionName]
export type ActionName = AllActionName
export type ActionInput<Name extends AllActionName> = Static<typeof actionContracts[Name]["params"]>
export type ActionResult<Name extends AllActionName> = Static<typeof actionContracts[Name]["result"]>
