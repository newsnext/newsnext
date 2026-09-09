import type { Static } from "typebox"
import { applicationActionContracts } from "./application.js"
import { backgroundActionContracts } from "./background.js"
import { createActionCatalog } from "./definition.js"

export { createActionsClient } from "./client.js"
export type { ActionsClient } from "./client.js"
export type { ActionContract, ActionDescriptor, ActionKind, ActionParamsOf, ActionResultOf } from "./definition.js"

export const actionContracts = createActionCatalog([...applicationActionContracts, ...backgroundActionContracts])
export type AllActionName = keyof typeof actionContracts
export type AllActionContract = typeof actionContracts[AllActionName]
export type ActionName = AllActionName
export type ActionInput<Name extends AllActionName> = Static<typeof actionContracts[Name]["params"]>
export type ActionResult<Name extends AllActionName> = Static<typeof actionContracts[Name]["result"]>
