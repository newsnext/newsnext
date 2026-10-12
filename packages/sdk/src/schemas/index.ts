import type { TSchema } from "typebox"
import type { SourceDescriptor } from "../models/source"
import Value from "typebox/value"
import { portableJsonSchemas } from "./definitions"

export const {
  action: actionManifestSchema,
  params: paramsSchema,
  plugin: pluginManifestSchema,
  source: sourceManifestSchema,
  "source-descriptor": sourceDescriptorSchema,
  insight: insightManifestSchema,
} = portableJsonSchemas

/** Parse resolved metadata without introducing a loader or authoring defaults. */
export function parseSourceDescriptor(value: unknown): SourceDescriptor {
  const issue = firstJsonSchemaIssue(sourceDescriptorSchema, value)
  if (issue) throw new TypeError(`Invalid Source descriptor${issue.instancePath}: ${issue.message}`)
  return value as SourceDescriptor
}

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

export { fieldTransformsDefinition, radarPageParamDefinition } from "./definitions"
