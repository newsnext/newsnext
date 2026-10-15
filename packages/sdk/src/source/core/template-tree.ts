export interface CompiledTemplateValue<T> {
  readonly render: (context: object) => T
}

export function isTemplate(value: string): boolean {
  return value.includes("{{") || value.includes("{%")
}

export function compileTemplateTree<TOptions extends { location: string }>(
  value: unknown,
  options: TOptions,
  compileString: (template: string, options: TOptions) => CompiledTemplateValue<unknown>,
): CompiledTemplateValue<unknown> {
  if (typeof value === "string") {
    if (!isTemplate(value)) return constantTemplateValue(value)
    return compileString(value, options)
  }

  if (Array.isArray(value)) {
    const children = value.map((child, index) => compileTemplateTree(
      child,
      {
        ...options,
        location: `${options.location}.${index}`,
      },
      compileString,
    ))
    return Object.freeze({
      render: (context: object) => children.map(child => child.render(context)),
    })
  }

  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    return constantTemplateValue(value)
  }

  const children = Object.entries(value).map(([key, child]) => [
    key,
    compileTemplateTree(child, {
      ...options,
      location: `${options.location}.${key}`,
    }, compileString),
  ] as const)
  return Object.freeze({
    render: (context: object) => Object.fromEntries(
      children.map(([key, child]) => [
        key,
        child.render(context),
      ]),
    ),
  })
}

function constantTemplateValue<T>(value: T): CompiledTemplateValue<T> {
  return Object.freeze({ render: () => value })
}
