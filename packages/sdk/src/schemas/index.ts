import type { TSchema } from "typebox"
import Value from "typebox/value"
import { portableJsonSchemas, sourceProviderDefinition } from "./definitions"

export const {
  action: actionManifestSchema,
  params: paramsSchema,
  plugin: pluginManifestSchema,
  source: sourceManifestSchema,
  insight: insightManifestSchema,
} = portableJsonSchemas

export const sourceProviderSchema = sourceProviderDefinition

/** Validate a schema without changing the input value. */
export function firstJsonSchemaIssue(
  schema: object,
  value: unknown,
): { instancePath: string, message: string } | undefined {
  const issue = Value.Errors(schema as TSchema, value)[0]
  return issue === undefined
    ? undefined
    : { instancePath: issue.instancePath, message: issue.message }
}

export { fieldTransformsDefinition, radarPageParamDefinition } from "./definitions"
