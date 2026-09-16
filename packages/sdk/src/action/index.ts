import type { Static } from "typebox"
import { applicationActionContracts } from "./application.js"
import { backgroundActionContracts } from "./background.js"
import { createActionCatalog, createEventCatalog } from "./definition.js"
import { backgroundEventContracts } from "./events.js"

export { createActionsClient } from "./client.js"
export type { ActionsClient } from "./client.js"
export type { ActionContract, ActionDescriptor, ActionKind, ActionParamsOf, ActionResultOf, EventContract, EventPayloadOf } from "./definition.js"

export const actionContracts = createActionCatalog([...applicationActionContracts, ...backgroundActionContracts])
export type AllActionName = keyof typeof actionContracts
export type AllActionContract = typeof actionContracts[AllActionName]
export type ActionName = AllActionName
export type ActionInput<Name extends AllActionName> = Static<typeof actionContracts[Name]["params"]>
export type ActionResult<Name extends AllActionName> = Static<typeof actionContracts[Name]["result"]>

export const eventContracts = createEventCatalog([...backgroundEventContracts])
export type AllEventName = keyof typeof eventContracts
export type EventPayload<Name extends AllEventName> = Static<typeof eventContracts[Name]["payload"]>
