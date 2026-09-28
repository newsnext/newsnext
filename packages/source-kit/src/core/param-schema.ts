import { firstJsonSchemaIssue, paramsSchema } from "@newsnext/sdk/schemas"

export function assertSourceParamDefinitionsShape(value: unknown, location: string): void {
  const issue = firstJsonSchemaIssue(paramsSchema, value)
  if (!issue) return
  const path = issue.instancePath
    .split("/")
    .slice(1)
    .map(segment => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .join(".")
  throw new TypeError(`${location}${path ? `.${path}` : ""} ${issue.message}`)
}
