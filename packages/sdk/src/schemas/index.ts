import type { TSchema } from "typebox"
import Value from "typebox/value"
import { portableJsonSchemas } from "./definitions"

export const {
  action: actionManifestSchema,
  params: paramsSchema,
  plugin: pluginManifestSchema,
  source: sourceManifestSchema,
  widget: widgetManifestSchema,
} = portableJsonSchemas

/** Validate a portable JSON Schema without changing the input value. */
export function firstJsonSchemaIssue(
  schema: object,
  value: unknown,
): { instancePath: string, message: string } | undefined {
  const issue = Value.Errors(schema as TSchema, value)[0]
  return issue === undefined
    ? undefined
    : { instancePath: issue.instancePath, message: issue.message }
}
