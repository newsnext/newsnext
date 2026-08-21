import type { Static, TSchema } from "typebox"
import Value from "typebox/value"

export type ActionKind = "mutation" | "query" | "command"
export type ActionAudience = "connected" | "ui"

export interface ActionDescriptor {
  description: string
  inputSchema: TSchema
  kind: ActionKind
  name: string
  outputSchema: TSchema
}

export interface ActionDiagnostics<Params, Result> {
  input?: (params: Params) => unknown
  output?: (result: Result) => unknown
}

export interface ActionDefinition<
  Name extends string = string,
  Params extends TSchema = TSchema,
  Result extends TSchema = TSchema,
  Context = unknown,
> {
  readonly audiences: readonly ActionAudience[]
  readonly description: string
  readonly diagnostics?: ActionDiagnostics<Static<Params>, Static<Result>>
  readonly kind: ActionKind
  readonly name: Name
  readonly params: Params
  readonly result: Result
  parse: (value: unknown) => Static<Params>
  execute: (value: unknown, context: Context) => Promise<Static<Result>>
}

export interface AnyActionDefinition {
  readonly audiences: readonly ActionAudience[]
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
  configuration: {
    audiences: readonly ActionAudience[]
    description: string
    diagnostics?: ActionDiagnostics<Static<Params>, Static<Result>>
    kind: ActionKind
    name: Name
    params: Params
    result: Result
    validate?: (params: Static<Params>) => void
  },
  handler: (params: Static<Params>, context: Context) => Static<Result> | Promise<Static<Result>>,
): ActionDefinition<Name, Params, Result, Context> {
  return {
    audiences: configuration.audiences,
    description: configuration.description,
    diagnostics: configuration.diagnostics,
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
      ? error.cause as { errors?: Array<{ instancePath?: string, message?: string }> } | undefined
      : undefined
    const issue = cause?.errors?.[0]
    const path = issue?.instancePath ? ` at '${issue.instancePath}'` : ""
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
    list(audience) {
      return definitions
        .filter(definition => !audience || definition.audiences.includes(audience))
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
  list: (audience?: ActionAudience) => ActionDescriptor[]
}

export type ActionName<Definition extends AnyActionDefinition> = Definition["name"]
export type ActionParamsOf<Definition extends AnyActionDefinition> = Definition extends ActionDefinition<
  string,
  infer Params extends TSchema,
  any,
  any
> ? Static<Params> : never
export type ActionResultOf<Definition extends AnyActionDefinition> = Definition extends ActionDefinition<
  string,
  any,
  infer Result extends TSchema,
  any
> ? Static<Result> : never
