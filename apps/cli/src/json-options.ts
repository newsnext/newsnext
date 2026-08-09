import { CliError } from "./errors"

export function parseJsonObject(value: string, label: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : ""
    throw new CliError(`Could not parse ${label} as JSON${detail}`, 2)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError(`${label} must be a JSON object`, 2)
  }
  return parsed as Record<string, unknown>
}
