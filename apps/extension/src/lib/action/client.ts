import type {
  ActionName,
  ActionParamsOf,
  ActionResultOf,
  AnyActionDefinition,
} from "./definition"

type Domain<Name extends string> = Name extends `${infer Value}.${string}` ? Value : never
type Verb<Name extends string, SelectedDomain extends string> = Name extends `${SelectedDomain}.${infer Value}`
  ? Value
  : never
type DefinitionFor<
  Definitions extends readonly AnyActionDefinition[],
  Name extends string,
> = Extract<Definitions[number], { name: Name }>
type Method<Definition extends AnyActionDefinition> = keyof ActionParamsOf<Definition> extends never
  ? () => Promise<ActionResultOf<Definition>>
  : (params: ActionParamsOf<Definition>) => Promise<ActionResultOf<Definition>>

export type ActionsClient<Definitions extends readonly AnyActionDefinition[]> = {
  [SelectedDomain in Domain<ActionName<Definitions[number]>>]: {
    [SelectedVerb in Verb<ActionName<Definitions[number]>, SelectedDomain>]: Method<DefinitionFor<
      Definitions,
      `${SelectedDomain}.${SelectedVerb}`
    >>
  }
}

export function createActionsClient<Definitions extends readonly AnyActionDefinition[]>(
  execute: (name: string, params: unknown) => Promise<unknown>,
): ActionsClient<Definitions> {
  const domains = new Map<string, object>()
  return new Proxy({}, {
    get(_target, domainProperty) {
      if (typeof domainProperty !== "string") return undefined
      const existing = domains.get(domainProperty)
      if (existing) return existing
      const domain = new Proxy({}, {
        get(_domainTarget, verbProperty) {
          if (typeof verbProperty !== "string") return undefined
          return (value: unknown = {}) => execute(`${domainProperty}.${verbProperty}`, value)
        },
      })
      domains.set(domainProperty, domain)
      return domain
    },
  }) as ActionsClient<Definitions>
}
