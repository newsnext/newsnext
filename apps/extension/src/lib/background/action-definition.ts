import type { ActionContract, ActionDescriptor, ActionKind } from "@newsnext/sdk/actions"
import type { Static, TSchema } from "typebox"
import Value from "typebox/value"

export interface ActionDiagnostics<Params, Result> {
  input?: (params: Params) => unknown
  output?: (result: Result) => unknown
}

export interface ActionDefinition<
  Name extends string = string,
  Params extends TSchema = TSchema,
  Result extends TSchema = TSchema,
  Context = unknown,
> extends Readonly<Omit<ActionContract<Name, Params, Result>, "validate">> {
  readonly diagnostics?: ActionDiagnostics<Static<Params>, Static<Result>>
  parse: (value: unknown) => Static<Params>
  execute: (value: unknown, context: Context) => Promise<Static<Result>>
}

export interface AnyActionDefinition {
  readonly description: string
  readonly diagnostics?: ActionDiagnostics<any, any>
  readonly kind: ActionKind
  readonly name: string
  readonly params: TSchema
  readonly result: TSchema
  parse: (value: unknown) => any
  execute: (value: unknown, context: any) => Promise<any>
}

export function defineAction<
  const Name extends string,
  const Params extends TSchema,
  const Result extends TSchema,
  Context,
>(
  configuration: ActionContract<Name, Params, Result>,
  handler: (params: Static<Params>, context: Context) => Static<Result> | Promise<Static<Result>>,
  diagnostics?: ActionDiagnostics<Static<Params>, Static<Result>>,
): ActionDefinition<Name, Params, Result, Context> {
  return {
    description: configuration.description,
    diagnostics,
    kind: configuration.kind,
    name: configuration.name,
    params: configuration.params,
    result: configuration.result,
    parse(value): Static<Params> {
      return parseActionValue(configuration.params, value, "parameters")
    },
    async execute(value, context): Promise<Static<Result>> {
      const parsed = parseActionValue(configuration.params, value, "parameters")
      configuration.validate?.(parsed)
      const result = await handler(parsed, context)
      return parseActionValue(configuration.result, result, "result")
    },
  }
}

function parseActionValue<Schema extends TSchema>(
  schema: Schema,
  value: unknown,
  label: string,
): Static<Schema> {
  try {
    return Value.Parse(schema, value)
  } catch (error) {
    const cause = error instanceof Error
      ? error.cause as { errors?: Array<{ liveCardPath?: string, message?: string }> } | undefined
      : undefined
    const issue = cause?.errors?.[0]
    const path = issue?.liveCardPath ? ` at '${issue.liveCardPath}'` : ""
    throw new Error(`Invalid Action ${label}${path}: ${issue?.message ?? "schema validation failed"}`)
  }
}

export function defineActionRegistry<const Definitions extends readonly AnyActionDefinition[]>(
  definitions: Definitions,
): ActionRegistry<Definitions> {
  const definitionsByName = new Map(definitions.map(definition => [definition.name, definition]))
  if (definitionsByName.size !== definitions.length) throw new Error("Action names must be unique")
  return {
    get(name) {
      return definitionsByName.get(name)
    },
    list() {
      return definitions
        .map(({ description, kind, name, params, result }) => ({
          description,
          inputSchema: params,
          kind,
          name,
          outputSchema: result,
        }))
    },
  }
}

export interface ActionRegistry<Definitions extends readonly AnyActionDefinition[]> {
  get: (name: string) => Definitions[number] | undefined
  list: () => ActionDescriptor[]
}
