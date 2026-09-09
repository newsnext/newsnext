import type {
  ActionName,
  ActionParamsOf,
  ActionResultOf,
  ActionShape,
} from "./definition.js"

type Domain<Name extends string> = Name extends `${infer Value}.${string}` ? Value : never
type Verb<Name extends string, SelectedDomain extends string> = Name extends `${SelectedDomain}.${infer Value}`
  ? Value
  : never
type DefinitionFor<
  Definitions extends readonly ActionShape[],
  Name extends string,
> = Extract<Definitions[number], { name: Name }>
type Method<Definition extends ActionShape, Options> = keyof ActionParamsOf<Definition> extends never
  ? (params?: Record<string, never>, options?: Options) => Promise<ActionResultOf<Definition>>
  : (params: ActionParamsOf<Definition>, options?: Options) => Promise<ActionResultOf<Definition>>

export type ActionsClient<Definitions extends readonly ActionShape[], Options = never> = {
  [SelectedDomain in Domain<ActionName<Definitions[number]>>]: {
    [SelectedVerb in Verb<ActionName<Definitions[number]>, SelectedDomain>]: Method<DefinitionFor<
      Definitions,
      `${SelectedDomain}.${SelectedVerb}`
    >, Options>
  }
}

export function createActionsClient<Definitions extends readonly ActionShape[], Options = never>(
  execute: (name: string, params: unknown, options?: Options) => Promise<unknown>,
): ActionsClient<Definitions, Options> {
  const domains = new Map<string, object>()
  return new Proxy({}, {
    get(target, domainProperty) {
      if (Object.hasOwn(target, domainProperty)) return Reflect.get(target, domainProperty)
      if (typeof domainProperty !== "string") return undefined
      const existing = domains.get(domainProperty)
      if (existing) return existing
      const domain = new Proxy({}, {
        get(_domainTarget, verbProperty) {
          if (typeof verbProperty !== "string") return undefined
          return (value: unknown = {}, options?: Options) => execute(`${domainProperty}.${verbProperty}`, value, options)
        },
      })
      domains.set(domainProperty, domain)
      return domain
    },
  }) as ActionsClient<Definitions, Options>
}
