export function resolveSourceIconUrl(
  template: string | undefined,
  params: Record<string, unknown>,
): string | undefined {
  if (!template) {
    return undefined
  }

  let isComplete = true
  const url = template.replace(/\{([^{}]+)\}/g, (_placeholder, key: string) => {
    const value = params[key]
    if (value === undefined || value === null || value === "") {
      isComplete = false
      return ""
    }

    return encodeURIComponent(String(value))
  })

  return isComplete ? url : undefined
}
