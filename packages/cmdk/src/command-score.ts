/*
 * Adapted from cmdk 1.1.1.
 *
 * MIT License
 * Copyright (c) 2022 Paco Coursey
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const SCORE_CONTINUE_MATCH = 1
const SCORE_SPACE_WORD_JUMP = 0.9
const SCORE_NON_SPACE_WORD_JUMP = 0.8
const SCORE_CHARACTER_JUMP = 0.17
const SCORE_TRANSPOSITION = 0.1
const PENALTY_SKIPPED = 0.999
const PENALTY_CASE_MISMATCH = 0.9999
const SCORE_NOT_COMPLETE = 0.99
const SPECIAL_CHARACTER = /[\\/_+.#"@[({&]/
const SPECIAL_CHARACTERS = /[\\/_+.#"@[({&]/g
const SPACE_OR_HYPHEN = /[\s-]/
const SPACES_OR_HYPHENS = /[\s-]/g

function normalize(value: string): string {
  return value.toLowerCase().replace(SPACES_OR_HYPHENS, " ")
}

function scoreMatch(
  value: string,
  search: string,
  normalizedValue: string,
  normalizedSearch: string,
  valueIndex: number,
  searchIndex: number,
  memo: Record<string, number>,
): number {
  if (searchIndex === search.length) {
    return valueIndex === value.length ? SCORE_CONTINUE_MATCH : SCORE_NOT_COMPLETE
  }

  const memoKey = `${valueIndex},${searchIndex}`
  if (memo[memoKey] !== undefined) {
    return memo[memoKey]
  }

  const searchCharacter = normalizedSearch.charAt(searchIndex)
  let matchIndex = normalizedValue.indexOf(searchCharacter, valueIndex)
  let bestScore = 0

  while (matchIndex >= 0) {
    let score = scoreMatch(
      value,
      search,
      normalizedValue,
      normalizedSearch,
      matchIndex + 1,
      searchIndex + 1,
      memo,
    )

    if (score > bestScore) {
      if (matchIndex === valueIndex) {
        score *= SCORE_CONTINUE_MATCH
      } else if (SPECIAL_CHARACTER.test(value.charAt(matchIndex - 1))) {
        score *= SCORE_NON_SPACE_WORD_JUMP
        const skipped = value.slice(valueIndex, matchIndex - 1).match(SPECIAL_CHARACTERS)
        if (skipped && valueIndex > 0) {
          score *= PENALTY_SKIPPED ** skipped.length
        }
      } else if (SPACE_OR_HYPHEN.test(value.charAt(matchIndex - 1))) {
        score *= SCORE_SPACE_WORD_JUMP
        const skipped = value.slice(valueIndex, matchIndex - 1).match(SPACES_OR_HYPHENS)
        if (skipped && valueIndex > 0) {
          score *= PENALTY_SKIPPED ** skipped.length
        }
      } else {
        score *= SCORE_CHARACTER_JUMP
        if (valueIndex > 0) {
          score *= PENALTY_SKIPPED ** (matchIndex - valueIndex)
        }
      }

      if (value.charAt(matchIndex) !== search.charAt(searchIndex)) {
        score *= PENALTY_CASE_MISMATCH
      }
    }

    const transposed = (
      score < SCORE_TRANSPOSITION
      && normalizedValue.charAt(matchIndex - 1) === normalizedSearch.charAt(searchIndex + 1)
    ) || (
      normalizedSearch.charAt(searchIndex + 1) === normalizedSearch.charAt(searchIndex)
      && normalizedValue.charAt(matchIndex - 1) !== normalizedSearch.charAt(searchIndex)
    )
    if (transposed) {
      const transposedScore = scoreMatch(
        value,
        search,
        normalizedValue,
        normalizedSearch,
        matchIndex + 1,
        searchIndex + 2,
        memo,
      ) * SCORE_TRANSPOSITION
      score = Math.max(score, transposedScore)
    }

    bestScore = Math.max(bestScore, score)
    matchIndex = normalizedValue.indexOf(searchCharacter, matchIndex + 1)
  }

  memo[memoKey] = bestScore
  return bestScore
}

export function commandScore(value: string, search: string, keywords: string[] = []): number {
  const searchableValue = keywords.length > 0 ? `${value} ${keywords.join(" ")}` : value
  return scoreMatch(
    searchableValue,
    search,
    normalize(searchableValue),
    normalize(search),
    0,
    0,
    {},
  )
}
