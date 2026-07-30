const REGEX_INPUT_LIMIT = 20_000
const REGEX_PATTERN_LIMIT = 500

export function compileSourceRegex(pattern: string, flags = ""): RegExp {
  if (!pattern) {
    throw new Error("A regex pattern cannot be empty")
  }
  if (pattern.length > REGEX_PATTERN_LIMIT) {
    throw new Error(`A regex pattern cannot exceed ${REGEX_PATTERN_LIMIT} characters`)
  }
  if (hasNestedQuantifiedGroup(pattern)) {
    throw new Error("Nested quantified groups are not allowed")
  }

  try {
    return new RegExp(pattern, flags)
  } catch (error) {
    throw new Error("Invalid regex pattern", { cause: error })
  }
}

export function validateSourceRegexInput(input: string): void {
  if (input.length > REGEX_INPUT_LIMIT) {
    throw new Error(`A regex input cannot exceed ${REGEX_INPUT_LIMIT} characters`)
  }
}

function hasNestedQuantifiedGroup(pattern: string): boolean {
  const groups: boolean[] = []
  let escaped = false
  let inCharacterClass = false

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === "\\") {
      escaped = true
      continue
    }
    if (character === "[") {
      inCharacterClass = true
      continue
    }
    if (character === "]" && inCharacterClass) {
      inCharacterClass = false
      continue
    }
    if (inCharacterClass) continue

    if (character === "(") {
      groups.push(false)
      continue
    }
    if (character === ")") {
      const containsQuantifier = groups.pop() ?? false
      const groupIsQuantified = isRegexQuantifierAt(pattern, index + 1)
      if (containsQuantifier && groupIsQuantified) return true
      if (groups.length > 0 && (containsQuantifier || groupIsQuantified)) {
        groups[groups.length - 1] = true
      }
      continue
    }
    if (
      groups.length > 0
      && isRegexQuantifierAt(pattern, index)
      && !(character === "?" && pattern[index - 1] === "(")
    ) {
      groups[groups.length - 1] = true
    }
  }

  return false
}

function isRegexQuantifierAt(pattern: string, index: number): boolean {
  const character = pattern[index]
  if (character === "*" || character === "+" || character === "?") return true
  if (character !== "{") return false

  let cursor = index + 1
  let digits = 0
  while (cursor < pattern.length && pattern[cursor] >= "0" && pattern[cursor] <= "9") {
    cursor += 1
    digits += 1
  }
  if (digits === 0) return false
  if (pattern[cursor] === ",") {
    cursor += 1
    while (cursor < pattern.length && pattern[cursor] >= "0" && pattern[cursor] <= "9") {
      cursor += 1
    }
  }
  return pattern[cursor] === "}"
}
