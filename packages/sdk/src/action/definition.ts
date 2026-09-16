import type { Static, TSchema } from "typebox"

export type ActionKind = "mutation" | "query" | "command"

export interface ActionDescriptor {
  description: string
  inputSchema: TSchema
  kind: ActionKind
  name: string
  outputSchema: TSchema
}

export interface ActionContract<
  Name extends string = string,
  Params extends TSchema = TSchema,
  Result extends TSchema = TSchema,
> {
  description: string
  kind: ActionKind
  name: Name
  params: Params
  result: Result
  validate?: (params: Static<Params>) => void
}

export function defineActionContract<
  const Name extends string,
  const Params extends TSchema,
  const Result extends TSchema,
>(configuration: ActionContract<Name, Params, Result>): ActionContract<Name, Params, Result> {
  return configuration
}

export interface ActionShape {
  readonly name: string
  readonly params: TSchema
  readonly result: TSchema
}
export type ActionName<Definition extends ActionShape> = Definition["name"]
export type ActionParamsOf<Definition extends ActionShape> = Static<Definition["params"]>
export type ActionResultOf<Definition extends ActionShape> = Static<Definition["result"]>

type ActionCatalog<Definitions extends readonly ActionShape[]> = {
  [Definition in Definitions[number] as Definition["name"]]: Definition
}

export function createActionCatalog<const Definitions extends readonly ActionShape[]>(
  definitions: Definitions,
): ActionCatalog<Definitions> {
  const entries = new Map<string, Definitions[number]>()
  for (const definition of definitions) {
    if (entries.has(definition.name)) {
      throw new Error(`Duplicate Action name '${definition.name}'`)
    }
    entries.set(definition.name, definition)
  }
  return Object.fromEntries(entries) as ActionCatalog<Definitions>
}

// Background-to-UI broadcasts: one-to-many, fire-and-forget. Unlike Actions they
// carry no caller and expect no result; receivers re-pull authoritative state.
export interface EventContract<
  Name extends string = string,
  Payload extends TSchema = TSchema,
> {
  description: string
  name: Name
  payload: Payload
}

export function defineEventContract<
  const Name extends string,
  const Payload extends TSchema,
>(configuration: EventContract<Name, Payload>): EventContract<Name, Payload> {
  return configuration
}

export interface EventShape {
  readonly name: string
  readonly payload: TSchema
}
export type EventPayloadOf<Definition extends EventShape> = Static<Definition["payload"]>

type EventCatalog<Definitions extends readonly EventShape[]> = {
  [Definition in Definitions[number] as Definition["name"]]: Definition
}

export function createEventCatalog<const Definitions extends readonly EventShape[]>(
  definitions: Definitions,
): EventCatalog<Definitions> {
  const entries = new Map<string, Definitions[number]>()
  for (const definition of definitions) {
    if (entries.has(definition.name)) {
      throw new Error(`Duplicate Event name '${definition.name}'`)
    }
    entries.set(definition.name, definition)
  }
  return Object.fromEntries(entries) as EventCatalog<Definitions>
}
