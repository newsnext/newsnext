import type { Duration } from "date-fns"
import { tz, tzOffset } from "@date-fns/tz"
import { add, isAfter, parse, set, setDay, sub, subWeeks } from "date-fns"

const DEFAULT_TIMEZONE = "Asia/Shanghai"
const MS_PER_MINUTE = 60 * 1000
const TODAY_REGEX = /^(?:今[天日]|to?day?)(.*)/
const YESTERDAY_REGEX = /^(?:昨[天日]|y(?:ester)?day?)(.*)/
const DAY_BEFORE_YESTERDAY_REGEX = /^(?:前天|(?:the)?d(?:ay)?b(?:eforeyesterda)?y)(.*)/
const MONDAY_REGEX = /^(?:周|星期)一(.*)/
const TUESDAY_REGEX = /^(?:周|星期)二(.*)/
const WEDNESDAY_REGEX = /^(?:周|星期)三(.*)/
const THURSDAY_REGEX = /^(?:周|星期)四(.*)/
const FRIDAY_REGEX = /^(?:周|星期)五(.*)/
const SATURDAY_REGEX = /^(?:周|星期)六(.*)/
const SUNDAY_REGEX = /^(?:周|星期)[天日](.*)/
const TOMORROW_REGEX = /^(?:明[天日]|tomorrow)(.*)/
const DAY_AFTER_TOMORROW_REGEX = /^(?:[后後][天日]|(?:the)?dayaftertomorrow)(.*)/
const NORMALIZE_ARTICLE_REGEX = /(^an?\s)|(\san?\s)/g
const NORMALIZE_HALF_HOUR_REGEX = /半个?小时/g
const NORMALIZE_SEVERAL_REGEX = /几|幾/g
const NORMALIZE_SEPARATOR_REGEX = /[\s,]/g
const RELATIVE_DURATION_REGEX = /\D*\d+(?![:\-/]|(a|p)m)\D+/g
const BEFORE_REGEX = /(.*)(?:前|ago)$/
const AFTER_REGEX = /(?:^in(.*)|(.*)[后後])$/
const COMPACT_RELATIVE_REGEX = /^\d+(?:mo|[ywdhms])$/
const LAST_WEEK_REGEX = /^(?:lastweek|上个?(?:周|星期))$/
const NEXT_WEEK_REGEX = /^(?:nextweek|下个?(?:周|星期))$/
const LAST_MONTH_REGEX = /^(?:lastmonth|上个?月)$/
const NEXT_MONTH_REGEX = /^(?:nextmonth|下个?月)$/
const LAST_YEAR_REGEX = /^(?:lastyear|去年|上一年)$/
const NEXT_YEAR_REGEX = /^(?:nextyear|明年|下一年)$/
const TIME_PREFIX_REGEX = /^(?:at|在|于)/
const TIME_REGEX = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(am|pm)?$/
const NOW_REGEX = /^(?:刚刚|刚才|现在|justnow|now)$/
const FOUR_DIGIT_YEAR_REGEX = /(\d+)(?:年|y(?:ears?)?)/
const MONTH_REGEX = /(\d+)(?:[个個]?月|months?|mo)/
const WEEK_REGEX = /(\d+)(?:周|[个個]?星期|w(?:eeks?)?)/
const DAY_REGEX = /(\d+)(?:天|日|d(?:ay)?s?)/
const HOUR_REGEX = /(\d+)(?:[个個]?(?:小?时|[時点點])|h(?:(?:ou)?r)?s?)/
const MINUTE_REGEX = /(\d+)(?:分[鐘钟]?|m(?:in(?:ute)?)?s?)/
const SECOND_REGEX = /(\d+)(?:秒[鐘钟]?|s(?:ec(?:ond)?)?s?)/

interface WordRule {
  startAt: Date
  regExp: RegExp
}

/**
 * Convert a wall-time string from any timezone to UTC timestamp.
 */
export function transformToUTC(date: string, formatString?: string, timezone: string = DEFAULT_TIMEZONE): number {
  assertTimeZone(timezone)
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

/** @deprecated Use transformToUTC instead. */
export function tranformToUTC(date: string, formatString?: string, timezone: string = DEFAULT_TIMEZONE): number {
  return transformToUTC(date, formatString, timezone)
}

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

function assertTimeZone(timezone: string): void {
  if (!isValidTimeZone(timezone)) {
    throw new RangeError(`Invalid IANA timezone: ${timezone}`)
  }
}

function getWeekdayStart(base: Date, weekday: number, context: ReturnType<typeof tz>) {
  const dayStart = set(base, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 })
  const candidate = setDay(dayStart, weekday, { weekStartsOn: 1, in: context })
  return isAfter(candidate, dayStart) ? subWeeks(candidate, 1, { in: context }) : candidate
}

function toUtcDate(date: Date): Date {
  return new Date(date.getTime())
}

function setTime(
  date: Date,
  time: string,
  context: ReturnType<typeof tz>,
): Date {
  if (!time) {
    return toUtcDate(date)
  }

  const match = TIME_REGEX.exec(time.replace(TIME_PREFIX_REGEX, ""))
  if (!match) {
    return new Date(Number.NaN)
  }

  let hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  const seconds = Number.parseInt(match[3] ?? "0", 10)
  const meridiem = match[4]

  if (
    minutes > 59
    || seconds > 59
    || (meridiem ? hours < 1 || hours > 12 : hours > 23)
  ) {
    return new Date(Number.NaN)
  }

  if (meridiem === "am") {
    hours %= 12
  } else if (meridiem === "pm") {
    hours = (hours % 12) + 12
  }

  return toUtcDate(set(date, {
    hours,
    minutes,
    seconds,
    milliseconds: 0,
  }, { in: context }))
}

// Build dynamic word list; keep here because Cloudflare may return zero when evaluated at module scope.
function buildWordRules(base: Date, context: ReturnType<typeof tz>): WordRule[] {
  return [
    { startAt: base, regExp: TODAY_REGEX },
    { startAt: sub(base, { days: 1 }, { in: context }), regExp: YESTERDAY_REGEX },
    { startAt: sub(base, { days: 2 }, { in: context }), regExp: DAY_BEFORE_YESTERDAY_REGEX },
    { startAt: getWeekdayStart(base, 1, context), regExp: MONDAY_REGEX },
    { startAt: getWeekdayStart(base, 2, context), regExp: TUESDAY_REGEX },
    { startAt: getWeekdayStart(base, 3, context), regExp: WEDNESDAY_REGEX },
    { startAt: getWeekdayStart(base, 4, context), regExp: THURSDAY_REGEX },
    { startAt: getWeekdayStart(base, 5, context), regExp: FRIDAY_REGEX },
    { startAt: getWeekdayStart(base, 6, context), regExp: SATURDAY_REGEX },
    { startAt: getWeekdayStart(base, 0, context), regExp: SUNDAY_REGEX },
    { startAt: add(base, { days: 1 }, { in: context }), regExp: TOMORROW_REGEX },
    { startAt: add(base, { days: 2 }, { in: context }), regExp: DAY_AFTER_TOMORROW_REGEX },
  ]
}

const patterns = [
  { unit: "years", regExp: FOUR_DIGIT_YEAR_REGEX },
  { unit: "months", regExp: MONTH_REGEX },
  { unit: "weeks", regExp: WEEK_REGEX },
  { unit: "days", regExp: DAY_REGEX },
  { unit: "hours", regExp: HOUR_REGEX },
  { unit: "minutes", regExp: MINUTE_REGEX },
  { unit: "seconds", regExp: SECOND_REGEX },
]

const patternSize = patterns.length

function normalizeDateString(raw: string) {
  return raw
    .toLowerCase()
    .replace(NORMALIZE_ARTICLE_REGEX, "1")
    .replace(NORMALIZE_HALF_HOUR_REGEX, "30分钟")
    .replace(NORMALIZE_SEVERAL_REGEX, "3")
    .replace(NORMALIZE_SEPARATOR_REGEX, "")
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
  if (durationMap.months) duration.months = Number.parseInt(durationMap.months, 10)
  if (durationMap.days) duration.days = Number.parseInt(durationMap.days, 10)
  if (durationMap.hours) duration.hours = Number.parseInt(durationMap.hours, 10)
  if (durationMap.minutes) duration.minutes = Number.parseInt(durationMap.minutes, 10)
  if (durationMap.seconds) duration.seconds = Number.parseInt(durationMap.seconds, 10)

  return duration
}

export function parseDate(date: string | number, formatString?: string, referenceDate: Date = new Date()): Date {
  if (typeof date === "number") return new Date(date)
  if (formatString) return parse(date, formatString, referenceDate)
  return new Date(date)
}

function resolveNamedPeriod(
  normalizedDate: string,
  now: Date,
  context: ReturnType<typeof tz>,
): Date | undefined {
  if (LAST_WEEK_REGEX.test(normalizedDate)) {
    return toUtcDate(sub(now, { weeks: 1 }, { in: context }))
  }
  if (NEXT_WEEK_REGEX.test(normalizedDate)) {
    return toUtcDate(add(now, { weeks: 1 }, { in: context }))
  }
  if (LAST_MONTH_REGEX.test(normalizedDate)) {
    return toUtcDate(sub(now, { months: 1 }, { in: context }))
  }
  if (NEXT_MONTH_REGEX.test(normalizedDate)) {
    return toUtcDate(add(now, { months: 1 }, { in: context }))
  }
  if (LAST_YEAR_REGEX.test(normalizedDate)) {
    return toUtcDate(sub(now, { years: 1 }, { in: context }))
  }
  if (NEXT_YEAR_REGEX.test(normalizedDate)) {
    return toUtcDate(add(now, { years: 1 }, { in: context }))
  }
  return undefined
}

export function parseRelativeDate(
  date: string,
  timezone: string = "UTC",
  referenceDate: Date = new Date(),
): Date {
  assertTimeZone(timezone)

  const context = tz(timezone)
  const now = context(referenceDate)
  const normalizedDate = normalizeDateString(date)

  if (NOW_REGEX.test(normalizedDate)) {
    return toUtcDate(now)
  }

  const namedPeriod = resolveNamedPeriod(normalizedDate, now, context)
  if (namedPeriod) {
    return namedPeriod
  }

  if (COMPACT_RELATIVE_REGEX.test(normalizedDate)) {
    return toUtcDate(sub(now, toDurationObject([normalizedDate]), { in: context }))
  }

  const matches = normalizedDate.match(RELATIVE_DURATION_REGEX)

  if (matches && matches.length > 0) {
    const tokens = [...matches]
    const lastMatch = tokens.pop()

    if (lastMatch) {
      const beforeMatches = BEFORE_REGEX.exec(lastMatch)
      if (beforeMatches) {
        tokens.push(beforeMatches[1])
        return toUtcDate(sub(now, toDurationObject(tokens), { in: context }))
      }

      const afterMatches = AFTER_REGEX.exec(lastMatch)
      if (afterMatches) {
        tokens.push(afterMatches[1] ?? afterMatches[2])
        return toUtcDate(add(now, toDurationObject(tokens), { in: context }))
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
          return toUtcDate(add(baseStart, toDurationObject(durationTokens), { in: context }))
        }
      }
    }
  } else {
    for (const rule of buildWordRules(now, context)) {
      const wordMatches = rule.regExp.exec(normalizedDate)
      if (wordMatches) {
        const dayStart = set(rule.startAt, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 })
        return setTime(dayStart, wordMatches[1], context)
      }
    }
  }

  return new Date(date)
}
