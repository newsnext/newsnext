export type SourceFieldTransform
  = { type: "append", value: string }
    | { type: "lowercase" }
    | { type: "multiply", value: number }
    | { type: "normalizeWhitespace" }
    | { type: "parseDate" }
    | { type: "prepend", value: string }
    | { type: "trim" }
    | { type: "uppercase" }

export function applyFieldTransforms(
  input: unknown,
  transforms: readonly SourceFieldTransform[] = [],
): unknown {
  if (transforms.length > 16) {
    throw new Error("A field cannot use more than 16 transforms")
  }

  return transforms.reduce<unknown>((value, transform) => {
    switch (transform.type) {
      case "append":
        return `${stringify(value)}${transform.value}`
      case "lowercase":
        return stringify(value).toLowerCase()
      case "multiply":
        if (!Number.isFinite(transform.value)) {
          throw new TypeError("The multiply transform requires a finite value")
        }
        return multiply(value, transform.value)
      case "normalizeWhitespace":
        return stringify(value).replace(/\s+/g, " ").trim()
      case "parseDate": {
        const timestamp = Date.parse(stringify(value))
        return Number.isFinite(timestamp) ? timestamp : undefined
      }
      case "prepend":
        return `${transform.value}${stringify(value)}`
      case "trim":
        return stringify(value).trim()
      case "uppercase":
        return stringify(value).toUpperCase()
      default:
        throw new Error(`Unsupported field transform: ${(transform as { type?: unknown }).type}`)
    }
  }, input)
}

export function normalizeTimestamp(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const timestamp = typeof value === "number" ? value : Number(value)
  return Number.isFinite(timestamp) ? timestamp : undefined
}

function stringify(value: unknown): string {
  return value === undefined || value === null ? "" : String(value)
}

function multiply(value: unknown, multiplier: number): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number * multiplier : undefined
}
