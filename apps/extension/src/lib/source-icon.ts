import type { SourceTemplateVars } from "@newsnext/source/types"
import {
  compileSourceTemplate,
  createSourceTemplateScope,
  isTemplate,
  reportTemplateError,
} from "@newsnext/source/core"

export function resolveSourceIconUrl(
  template: string | undefined,
  params: Record<string, unknown>,
  vars: SourceTemplateVars = {},
  sourceId = "source",
): string | undefined {
  if (!template) {
    return undefined
  }

  if (!isTemplate(template)) {
    return template
  }

  try {
    return compileSourceTemplate(template, {
      location: `${sourceId}.metadata.icon`,
      slot: "metadata",
    }).render(createSourceTemplateScope(vars, { params })) || undefined
  } catch (error) {
    reportTemplateError(error)
    return undefined
  }
}
