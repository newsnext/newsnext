import type { SerializedError } from "@/lib/native-protocol/SerializedError"

function getStringProperty(value: object, key: string): string | undefined {
  const property = (value as Record<string, unknown>)[key]
  return typeof property === "string" ? property : undefined
}

export function serializeNativeIntegrationError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: getStringProperty(error, "code"),
      loginUrl: getStringProperty(error, "loginUrl"),
    }
  }

  return {
    name: "Error",
    message: String(error),
  }
}
