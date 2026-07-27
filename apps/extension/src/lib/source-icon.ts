import { isTemplate, renderTemplate } from "@newsnext/source/core"

export function resolveSourceIconUrl(
  template: string | undefined,
  params: Record<string, unknown>,
): string | undefined {
  if (!template) {
    return undefined
  }

  if (!isTemplate(template)) {
    return template
  }

  try {
    return renderTemplate(template, { params }) || undefined
  } catch {
    return undefined
  }
}
