import { escape } from "entities"

type Value = { kind: "literal", value: string | number | boolean | null } | Path
interface Path { kind: "path", root: string, keys: Value[] }
type Encoding = "url_path" | "url_query"
type Fallback = "??" | "||"
interface Expression { values: Value[], fallback?: Fallback, encoding?: Encoding, source: string, offset: number }
type Token = string | Expression

const MAX_TEMPLATE_LENGTH = 10_000
const MAX_OUTPUT_LENGTH = 100_000
const MAX_PATH_DEPTH = 16
const forbiddenKeys = new Set(["__proto__", "prototype", "constructor"])

export interface CompiledInterpolation {
  render: (context: object) => string | undefined
  /** A whole-expression template keeps its value type; mixed text stays text. */
  renderValue: (context: object) => unknown
}

/** Compile bounded interpolation only. No tags, function calls, or executable code. */
export function compileInterpolation(template: string, html = false, allowedPaths?: readonly string[]): CompiledInterpolation {
  if (template.length > MAX_TEMPLATE_LENGTH) throw new Error("Template cannot exceed 10000 characters")
  if (template.includes("{%")) throw new Error("Template tags are not allowed; use interpolation or TypeScript")
  const tokens: Token[] = []
  let cursor = 0
  while (cursor < template.length) {
    const start = template.indexOf("{{", cursor)
    if (start < 0) {
      tokens.push(template.slice(cursor))
      break
    }
    if (start > cursor) tokens.push(template.slice(cursor, start))
    const parser = new ExpressionParser(template, start + 2, allowedPaths)
    tokens.push(parser.parse())
    cursor = parser.position
  }
  const render = (context: object): string | undefined => {
    let output = ""
    for (const token of tokens) {
      if (typeof token === "string") {
        output += token
      } else {
        const text = renderExpression(token, () => {
          const value = evaluate(token, context)
          if (value === null || value === undefined) return undefined
          const text = stringify(value)
          return html ? escape(text) : text
        })
        if (text === undefined) return undefined
        output += text
      }
      if (output.length > MAX_OUTPUT_LENGTH) throw new Error("Template output cannot exceed 100000 characters")
    }
    return output
  }
  const expression = tokens.length === 1 && typeof tokens[0] !== "string" ? tokens[0] : undefined
  return {
    render,
    renderValue: expression
      ? context => renderExpression(expression, () => evaluate(expression, context))
      : render,
  }
}

function evaluate(expression: Expression, context: object): unknown {
  let value: unknown
  for (const candidate of expression.values) {
    value = lookup(candidate, context)
    if (expression.fallback === "||" ? Boolean(value) : value !== null && value !== undefined) break
  }
  return expression.encoding && value !== null && value !== undefined ? encodeURIComponent(stringify(value)) : value
}

function renderExpression<T>(expression: Expression, render: () => T): T {
  try {
    return render()
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const message = `${detail} in ${expression.source} at offset ${expression.offset}`
    throw new Error(message, { cause: error })
  }
}

class ExpressionParser {
  private readonly template: string
  private readonly allowedPaths?: readonly string[]
  position: number

  constructor(template: string, position: number, allowedPaths?: readonly string[]) {
    this.template = template
    this.position = position
    this.allowedPaths = allowedPaths
  }

  parse(): Expression {
    const start = this.position - 2
    const values = [this.value(0)]
    let fallback: Fallback | undefined
    while (true) {
      const operator = this.consume("??") ? "??" : this.consume("||") ? "||" : undefined
      if (!operator) break
      if (fallback && fallback !== operator) throw new Error("Cannot mix ?? and || in one template expression")
      fallback = operator
      values.push(this.value(0))
    }
    let encoding: Encoding | undefined
    if (this.consume("|")) {
      const name = this.identifier()
      if (name === "raw") throw new Error("The raw filter is not allowed")
      if (name !== "url_path" && name !== "url_query") throw new Error(`Unknown template filter "${name}"`)
      encoding = name
    }
    this.expect("}}")
    return { values, fallback, encoding, source: this.template.slice(start, this.position), offset: start }
  }

  private value(depth: number): Value {
    if (depth > MAX_PATH_DEPTH) throw new Error("Template path nesting cannot exceed 16 levels")
    this.whitespace()
    const quote = this.template[this.position]
    if (quote === "'" || quote === "\"") return { kind: "literal", value: this.string(quote) }
    const number = this.template.slice(this.position).match(/^-?\d+(?:\.\d+)?/)
    if (number) {
      this.position += number[0].length
      const value = Number(number[0])
      if (!Number.isFinite(value)) throw new Error("Template numbers must be finite")
      if (Number.isInteger(value) && !Number.isSafeInteger(value)) throw new Error("Unsafe template integer; quote opaque IDs as strings")
      return { kind: "literal", value }
    }
    const root = this.identifier()
    if (root === "true" || root === "false") return { kind: "literal", value: root === "true" }
    if (root === "null" || root === "nil") return { kind: "literal", value: null }
    const path: Path = { kind: "path", root, keys: [] }
    while (true) {
      if (this.consume(".")) {
        path.keys.push({ kind: "literal", value: this.identifier() })
      } else if (this.consume("[")) {
        path.keys.push(this.value(depth + 1))
        this.expect("]")
      } else {
        break
      }
      if (path.keys.length > MAX_PATH_DEPTH) throw new Error("Template paths cannot exceed 16 segments")
    }
    this.validatePath(path)
    return path
  }

  private validatePath(path: Path): void {
    const prefix = [path.root]
    for (const key of path.keys) {
      if (key.kind !== "literal") break
      if (typeof key.value !== "string" && typeof key.value !== "number") throw new Error("Template property keys must be strings or numbers")
      if (forbiddenKeys.has(String(key.value))) throw new Error(`Template property "${key.value}" is not allowed`)
      prefix.push(String(key.value))
    }
    if (this.allowedPaths && !this.allowedPaths.some(allowed => allowed.split(".").every((key, index) => key === prefix[index]))) {
      throw new Error(`Template path "${prefix.join(".")}" is not available; expected one of: ${this.allowedPaths.join(", ")}`)
    }
  }

  private identifier(): string {
    this.whitespace()
    const match = this.template.slice(this.position).match(/^[A-Z_]\w*/i)
    if (!match) throw new Error(`Expected template value at ${this.position}`)
    this.position += match[0].length
    if (forbiddenKeys.has(match[0])) throw new Error(`Template property "${match[0]}" is not allowed`)
    return match[0]
  }

  private string(quote: string): string {
    this.position++
    let value = ""
    while (this.position < this.template.length) {
      const char = this.template[this.position++]!
      if (char === quote) return value
      if (char !== "\\") {
        value += char
      } else {
        const escaped = this.template[this.position++]
        const escapes: Record<string, string> = { "n": "\n", "r": "\r", "t": "\t", "\\": "\\", "'": "'", "\"": "\"" }
        if (escaped === undefined || !Object.hasOwn(escapes, escaped)) throw new Error("Invalid template string escape")
        value += escapes[escaped]
      }
    }
    throw new Error("Unclosed template string")
  }

  private whitespace(): void {
    while (/\s/.test(this.template[this.position] ?? "") && this.position < this.template.length) this.position++
  }

  private consume(text: string): boolean {
    this.whitespace()
    if (!this.template.startsWith(text, this.position)) return false
    this.position += text.length
    return true
  }

  private expect(text: string): void {
    if (!this.consume(text)) throw new Error(`Expected "${text}" at ${this.position}`)
  }
}

function lookup(value: Value, context: object): unknown {
  if (value.kind === "literal") return value.value
  let current: unknown = context
  for (const key of [{ kind: "literal", value: value.root } as const, ...value.keys]) {
    const property = lookup(key, context)
    if (property == null) return undefined
    if (typeof property !== "string" && typeof property !== "number") throw new Error("Template property keys must be strings or numbers")
    if (forbiddenKeys.has(String(property))) throw new Error(`Template property "${property}" is not allowed`)
    if (current == null || typeof current !== "object" || !Object.hasOwn(current, property)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[property]
  }
  return current
}

function stringify(value: unknown): string {
  if (value == null) return ""
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    throw new TypeError("Template output must be a string, number, or boolean")
  }
  const text = String(value)
  if (text.length > MAX_OUTPUT_LENGTH) throw new Error("Template output cannot exceed 100000 characters")
  return text
}
