import type { ExtensionConnectionCommandRequest } from "./types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseExtensionConnectionCommandRequest(
  value: unknown,
): ExtensionConnectionCommandRequest {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("Invalid extension command")
  }
  if (value.type === "action.list") {
    return { id: value.id, type: "action.list" }
  }
  if (
    value.type === "action.execute"
    && typeof value.name === "string"
    && value.name.length > 0
    && isRecord(value.input)
  ) {
    return {
      id: value.id,
      type: "action.execute",
      name: value.name,
      input: value.input,
    }
  }
  throw new Error("Invalid extension command")
}
