import { firstJsonSchemaIssue, sourceManifestSchema } from "@newsnext/sdk/schemas"

/** Validate a JSON provider before defaults are merged or loaders are resolved. */
export function validateJsonSourceManifest(value: unknown, location: string): void {
  const issue = firstJsonSchemaIssue(sourceManifestSchema, value)
  if (issue) {
    throw new TypeError(`Invalid ${location}${issue.instancePath.replaceAll("/", ".")}: ${issue.message}`)
  }
}
