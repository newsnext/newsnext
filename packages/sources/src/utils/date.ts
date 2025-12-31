import type { Duration } from "date-fns"
import { tz, tzOffset } from "@date-fns/tz"
import { add, format, isAfter, parse, set, setDay, sub, subWeeks } from "date-fns"

const DEFAULT_TIMEZONE = "Asia/Shanghai"
const DAYS_PER_MONTH = 30
const MS_PER_MINUTE = 60 * 1000

interface WordRule {
  startAt: Date
  regExp: RegExp
}

/**
 * Convert a wall-time string from any timezone to UTC timestamp.
 */
export function tranformToUTC(date: string, formatString?: string, timezone: string = DEFAULT_TIMEZONE): number {
  const base = formatString ? parse(date, formatString, new Date()) : new Date(date)

  const y = base.getFullYear()
  const m = base.getMonth()
  const d = base.getDate()
  const h = base.getHours()
  const mi = base.getMinutes()
  const s = base.getSeconds()
  const ms = base.getMilliseconds()

  const utcFromWall = Date.UTC(y, m, d, h, mi, s, ms)
  const offsetMinutes = tzOffset(timezone, new Date(utcFromWall))

  return utcFromWall - offsetMinutes * MS_PER_MINUTE
}

function getWeekdayStart(base: Date, weekday: number, context: ReturnType<typeof tz>) {
  const candidate = setDay(base, weekday, { weekStartsOn: 1, in: context })
  return isAfter(base, candidate) ? candidate : subWeeks(candidate, 1, { in: context })
}

// Build dynamic word list; keep here because Cloudflare may return zero when evaluated at module scope.
function buildWordRules(base: Date, context: ReturnType<typeof tz>): WordRule[] {
  return [
    { startAt: base, regExp: /^(?:今[天日]|to?day?)(.*)/ },
    { startAt: sub(base, { days: 1 }, { in: context }), regExp: /^(?:昨[天日]|y(?:ester)?day?)(.*)/ },
    { startAt: sub(base, { days: 2 }, { in: context }), regExp: /^(?:前天|(?:the)?d(?:ay)?b(?:eforeyesterda)?y)(.*)/ },
    { startAt: getWeekdayStart(base, 1, context), regExp: /^(?:周|星期)一(.*)/ },
    { startAt: getWeekdayStart(base, 2, context), regExp: /^(?:周|星期)二(.*)/ },
    { startAt: getWeekdayStart(base, 3, context), regExp: /^(?:周|星期)三(.*)/ },
    { startAt: getWeekdayStart(base, 4, context), regExp: /^(?:周|星期)四(.*)/ },
    { startAt: getWeekdayStart(base, 5, context), regExp: /^(?:周|星期)五(.*)/ },
    { startAt: getWeekdayStart(base, 6, context), regExp: /^(?:周|星期)六(.*)/ },
    { startAt: getWeekdayStart(base, 0, context), regExp: /^(?:周|星期)[天日](.*)/ },
    { startAt: add(base, { days: 1 }, { in: context }), regExp: /^(?:明[天日]|y(?:ester)?day?)(.*)/ },
    { startAt: add(base, { days: 2 }, { in: context }), regExp: /^(?:[后後][天日]|(?:the)?d(?:ay)?a(?:fter)?t(?:omrrow)?)(.*)/ },
  ]
}

const patterns = [
  { unit: "years", regExp: /(\d+)(?:年|y(?:ea)?rs?)/ },
  { unit: "months", regExp: /(\d+)(?:[个個]?月|months?)/ },
  { unit: "weeks", regExp: /(\d+)(?:周|[个個]?星期|weeks?)/ },
  { unit: "days", regExp: /(\d+)(?:天|日|d(?:ay)?s?)/ },
  { unit: "hours", regExp: /(\d+)(?:[个個]?(?:小?时|[時点點])|h(?:(?:ou)?r)?s?)/ },
  { unit: "minutes", regExp: /(\d+)(?:分[鐘钟]?|m(?:in(?:ute)?)?s?)/ },
  { unit: "seconds", regExp: /(\d+)(?:秒[鐘钟]?|s(?:ec(?:ond)?)?s?)/ },
]

const patternSize = patterns.length

function normalizeDateString(raw: string) {
  return raw.toLowerCase().replace(/(^an?\s)|(\san?\s)/g, "1").replace(/几|幾/g, "3").replace(/[\s,]/g, "")
}

function toDurations(matches: string[]) {
  const durations: Record<string, string> = {}

  let p = 0
  for (const m of matches) {
    for (; p < patternSize; p++) {
      const match = patterns[p].regExp.exec(m)
      if (match) {
        durations[patterns[p].unit] = match[1]
        break
      }
    }
  }

  if (durations.weeks) {
    const weeks = Number.parseInt(durations.weeks, 10)
    const days = Number.parseInt(durations.days ?? "0", 10)
    durations.days = (days + weeks * 7).toString()
    delete durations.weeks
  }

  return durations
}

function toDurationObject(matches: string[]): Duration {
  const durationMap = toDurations(matches)
  const duration: Duration = {}

  if (durationMap.years) duration.years = Number.parseInt(durationMap.years, 10)
  if (durationMap.months) {
    const months = Number.parseInt(durationMap.months, 10)
    duration.days = (duration.days ?? 0) + months * DAYS_PER_MONTH
  }
  if (durationMap.days) duration.days = Number.parseInt(durationMap.days, 10)
  if (durationMap.hours) duration.hours = Number.parseInt(durationMap.hours, 10)
  if (durationMap.minutes) duration.minutes = Number.parseInt(durationMap.minutes, 10)
  if (durationMap.seconds) duration.seconds = Number.parseInt(durationMap.seconds, 10)

  return duration
}

export const parseDate = (date: string | number, formatString?: string, referenceDate: Date = new Date()) => {
  if (typeof date === "number") return new Date(date)
  if (formatString) return parse(date, formatString, referenceDate)
  return new Date(date)
}

export function parseRelativeDate(date: string, timezone: string = "UTC") {
  if (date === "刚刚") return new Date()

  const context = tz(timezone)
  const now = context(new Date())
  const normalizedDate = normalizeDateString(date)

  const matches = normalizedDate.match(/\D*\d+(?![:\-/]|(a|p)m)\D+/g)

  if (matches && matches.length > 0) {
    const tokens = [...matches]
    const lastMatch = tokens.pop()

    if (lastMatch) {
      const beforeMatches = /(.*)(?:前|ago)$/.exec(lastMatch)
      if (beforeMatches) {
        tokens.push(beforeMatches[1])
        return sub(now, toDurationObject(tokens), { in: context })
      }

      const afterMatches = /(?:^in(.*)|(.*)[后後])$/.exec(lastMatch)
      if (afterMatches) {
        tokens.push(afterMatches[1] ?? afterMatches[2])
        return add(now, toDurationObject(tokens), { in: context })
      }

      tokens.push(lastMatch)
    }

    const [firstMatch, ...rest] = tokens

    if (firstMatch) {
      for (const rule of buildWordRules(now, context)) {
        const wordMatches = rule.regExp.exec(firstMatch)
        if (wordMatches) {
          const durationTokens = [wordMatches[1], ...rest]
          const baseStart = set(rule.startAt, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 })
          return add(baseStart, toDurationObject(durationTokens), { in: context })
        }
      }
    }
  } else {
    for (const rule of buildWordRules(now, context)) {
      const wordMatches = rule.regExp.exec(normalizedDate)
      if (wordMatches) {
        const timeString = /a|pm$/.test(wordMatches[1]) ? wordMatches[1].replace(/a|pm/, " $&") : wordMatches[1]
        const dayString = format(rule.startAt, "yyyy-MM-dd", { in: context })

        return context(`${dayString} ${timeString}`)
      }
    }
  }

  return new Date(date)
}
