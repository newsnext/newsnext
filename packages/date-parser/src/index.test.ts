import process from "node:process"
import { add, sub } from "date-fns"
import MockDate from "mockdate"
import { afterAll, describe, expect, it } from "vitest"
import {
  isValidTimeZone,
  parseRelativeDate,
  transformToUTC,
} from "./index"

describe("parseRelativeDate", () => {
  Object.assign(process.env, { TZ: "UTC" })
  const second = 1000
  const minute = 60 * second
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const date = new Date("2025-08-31T12:00:00.000Z")
  const dayStart = new Date("2025-08-31T00:00:00.000Z")

  const weekday = (d: number) => +new Date(date.getFullYear(), date.getMonth(), date.getDate() + d - (date.getDay() > d ? date.getDay() : date.getDay() + 7))

  // 固定时间
  MockDate.set(date)

  it("s秒钟前", () => {
    expect(+new Date(parseRelativeDate("10秒前"))).toBe(+date - 10 * second)
  })

  it("m分钟前", () => {
    expect(+new Date(parseRelativeDate("10分钟前"))).toBe(+date - 10 * minute)
  })

  it("m分鐘前", () => {
    expect(+new Date(parseRelativeDate("10分鐘前"))).toBe(+date - 10 * minute)
  })

  it("m分钟后", () => {
    expect(+new Date(parseRelativeDate("10分钟后"))).toBe(+date + 10 * minute)
  })

  it("a minute ago", () => {
    expect(+new Date(parseRelativeDate("a minute ago"))).toBe(+date - 1 * minute)
  })

  it("s minutes ago", () => {
    expect(+new Date(parseRelativeDate("10 minutes ago"))).toBe(+date - 10 * minute)
  })

  it("s mins ago", () => {
    expect(+new Date(parseRelativeDate("10 mins ago"))).toBe(+date - 10 * minute)
  })

  it("in s minutes", () => {
    expect(+new Date(parseRelativeDate("in 10 minutes"))).toBe(+date + 10 * minute)
  })

  it("in an hour", () => {
    expect(+new Date(parseRelativeDate("in an hour"))).toBe(+date + 1 * hour)
  })

  it("h小时前", () => {
    expect(+new Date(parseRelativeDate("10小时前"))).toBe(+date - 10 * hour)
  })

  it("h个小时前", () => {
    expect(+new Date(parseRelativeDate("10个小时前"))).toBe(+date - 10 * hour)
  })

  it("d天前", () => {
    expect(+new Date(parseRelativeDate("10天前"))).toBe(+date - 10 * day)
  })

  it("w周前", () => {
    expect(+new Date(parseRelativeDate("10周前"))).toBe(+date - 10 * week)
  })

  it("w星期前", () => {
    expect(+new Date(parseRelativeDate("10星期前"))).toBe(+date - 10 * week)
  })

  it("w个星期前", () => {
    expect(+new Date(parseRelativeDate("10个星期前"))).toBe(+date - 10 * week)
  })

  it("m月前", () => {
    expect(+new Date(parseRelativeDate("1月前"))).toBe(+sub(date, { months: 1 }))
  })

  it("m个月前", () => {
    expect(+new Date(parseRelativeDate("1个月前"))).toBe(+sub(date, { months: 1 }))
  })

  it("m个月后", () => {
    expect(+new Date(parseRelativeDate("1个月后"))).toBe(+add(date, { months: 1 }))
  })

  it("y年前", () => {
    expect(+new Date(parseRelativeDate("1年前"))).toBe(+sub(date, { years: 1 }))
  })

  it("y年M个月前", () => {
    expect(+new Date(parseRelativeDate("1年1个月前"))).toBe(+sub(date, { years: 1, months: 1 }))
  })

  it("d天H小时前", () => {
    expect(+new Date(parseRelativeDate("1天1小时前"))).toBe(+date - 1 * day - 1 * hour)
  })

  it("h小时m分钟s秒钟前", () => {
    expect(+new Date(parseRelativeDate("1小时1分钟1秒钟前"))).toBe(+date - 1 * hour - 1 * minute - 1 * second)
  })

  it("dd Hh mm ss ago", () => {
    expect(+new Date(parseRelativeDate("1d 1h 1m 1s ago"))).toBe(+date - 1 * day - 1 * hour - 1 * minute - 1 * second)
  })

  it("h小时m分钟s秒钟后", () => {
    expect(+new Date(parseRelativeDate("1小时1分钟1秒钟后"))).toBe(+date + 1 * hour + 1 * minute + 1 * second)
  })

  it("今天", () => {
    expect(+new Date(parseRelativeDate("今天"))).toBe(+dayStart)
  })

  it("today H:m", () => {
    expect(+new Date(parseRelativeDate("Today 08:00"))).toBe(+dayStart + 8 * hour)
  })

  it("today, h:m a", () => {
    expect(+new Date(parseRelativeDate("Today, 8:00 pm"))).toBe(+dayStart + 20 * hour)
  })

  it("tDA H:m:s", () => {
    expect(+new Date(parseRelativeDate("TDA 08:00:00"))).toBe(+dayStart + 8 * hour)
  })

  it("今天 H:m", () => {
    expect(+new Date(parseRelativeDate("今天 08:00"))).toBe(+dayStart + 8 * hour)
  })

  it("今天H点m分", () => {
    expect(+new Date(parseRelativeDate("今天8点0分"))).toBe(+dayStart + 8 * hour)
  })

  it("昨日H点m分s秒", () => {
    expect(+new Date(parseRelativeDate("昨日20时0分0秒"))).toBe(+dayStart - 4 * hour)
  })

  it("前天 H:m", () => {
    expect(+new Date(parseRelativeDate("前天 20:00"))).toBe(+dayStart - 1 * day - 4 * hour)
  })

  it("明天 H:m", () => {
    expect(+new Date(parseRelativeDate("明天 20:00"))).toBe(+dayStart + 1 * day + 20 * hour)
  })

  it("tomorrow H:m", () => {
    expect(+new Date(parseRelativeDate("Tomorrow 20:00"))).toBe(+dayStart + 1 * day + 20 * hour)
  })

  it("后天 H:m", () => {
    expect(+new Date(parseRelativeDate("后天 20:00"))).toBe(+dayStart + 2 * day + 20 * hour)
  })

  it("the day after tomorrow H:m", () => {
    expect(+new Date(parseRelativeDate("The day after tomorrow 20:00"))).toBe(+dayStart + 2 * day + 20 * hour)
  })

  it("星期几 h:m", () => {
    expect(+new Date(parseRelativeDate("星期一 8:00"))).toBe(weekday(1) + 8 * hour)
  })

  it("周几 h:m", () => {
    expect(+new Date(parseRelativeDate("周二 8:00"))).toBe(weekday(2) + 8 * hour)
  })

  it.each([
    ["星期三", 3],
    ["星期四", 4],
    ["星期五", 5],
    ["星期六", 6],
  ])("%s h:m", (label, dayOfWeek) => {
    expect(+new Date(parseRelativeDate(`${label} 8:00`))).toBe(weekday(dayOfWeek) + 8 * hour)
  })

  it("星期天 h:m", () => {
    expect(+new Date(parseRelativeDate("星期天 8:00"))).toBe(weekday(7) + 8 * hour)
  })

  it("invalid", () => {
    expect(parseRelativeDate("RSSHub").getTime()).toBeNaN()
  })
})

describe("parse relative dates as UTC in different system timezones", () => {
  const originalTimezone = process.env.TZ
  const fixedNow = "2025-08-31T12:00:00.000Z"

  afterAll(() => {
    process.env.TZ = originalTimezone
    MockDate.reset()
  })

  it.each([
    "UTC",
    "Asia/Shanghai",
    "America/New_York",
  ])("returns the same UTC results in %s", (systemTimezone) => {
    process.env.TZ = systemTimezone
    MockDate.set(fixedNow)

    expect(parseRelativeDate("Today 08:00").toISOString()).toBe("2025-08-31T08:00:00.000Z")
    expect(parseRelativeDate("Tomorrow 20:00").toISOString()).toBe("2025-09-01T20:00:00.000Z")
    expect(parseRelativeDate("星期天 8:00").toISOString()).toBe("2025-08-31T08:00:00.000Z")
    expect(parseRelativeDate("1个月后").toISOString()).toBe("2025-09-30T12:00:00.000Z")
    expect(parseRelativeDate("Today 08:00", "Asia/Shanghai").toISOString()).toBe("2025-08-31T00:00:00.000Z")
    expect(parseRelativeDate("Today 08:00", "America/New_York").toISOString()).toBe("2025-08-31T12:00:00.000Z")
    expect(parseRelativeDate("星期六 08:00", "Asia/Shanghai").toISOString()).toBe("2025-08-30T00:00:00.000Z")
    expect(parseRelativeDate("星期六 08:00", "America/New_York").toISOString()).toBe("2025-08-30T12:00:00.000Z")
  })
})

describe("common webpage relative date formats", () => {
  const referenceDate = new Date("2025-08-31T12:00:00.000Z")

  it.each([
    ["just now", "2025-08-31T12:00:00.000Z"],
    ["now", "2025-08-31T12:00:00.000Z"],
    ["刚才", "2025-08-31T12:00:00.000Z"],
    ["现在", "2025-08-31T12:00:00.000Z"],
    ["2h", "2025-08-31T10:00:00.000Z"],
    ["5m", "2025-08-31T11:55:00.000Z"],
    ["3d", "2025-08-28T12:00:00.000Z"],
    ["2w", "2025-08-17T12:00:00.000Z"],
    ["1mo", "2025-07-31T12:00:00.000Z"],
    ["1y", "2024-08-31T12:00:00.000Z"],
    ["半小时前", "2025-08-31T11:30:00.000Z"],
    ["几分钟前", "2025-08-31T11:57:00.000Z"],
  ])("parses %s", (input, expected) => {
    expect(parseRelativeDate(input, "UTC", referenceDate).toISOString()).toBe(expected)
  })

  it.each([
    ["last week", "2025-08-24T12:00:00.000Z"],
    ["上周", "2025-08-24T12:00:00.000Z"],
    ["next week", "2025-09-07T12:00:00.000Z"],
    ["下个星期", "2025-09-07T12:00:00.000Z"],
    ["last month", "2025-07-31T12:00:00.000Z"],
    ["上个月", "2025-07-31T12:00:00.000Z"],
    ["next month", "2025-09-30T12:00:00.000Z"],
    ["下个月", "2025-09-30T12:00:00.000Z"],
    ["last year", "2024-08-31T12:00:00.000Z"],
    ["去年", "2024-08-31T12:00:00.000Z"],
    ["next year", "2026-08-31T12:00:00.000Z"],
    ["明年", "2026-08-31T12:00:00.000Z"],
  ])("parses named period %s", (input, expected) => {
    expect(parseRelativeDate(input, "UTC", referenceDate).toISOString()).toBe(expected)
  })

  it.each([
    ["Today at 08:00", "2025-08-31T08:00:00.000Z"],
    ["Yesterday at 8:00 pm", "2025-08-30T20:00:00.000Z"],
    ["今天在08:00", "2025-08-31T08:00:00.000Z"],
  ])("parses webpage clock format %s", (input, expected) => {
    expect(parseRelativeDate(input, "UTC", referenceDate).toISOString()).toBe(expected)
  })

  it("passes through an absolute ISO timestamp", () => {
    expect(
      parseRelativeDate("2025-08-31T08:00:00+08:00", "America/New_York", referenceDate).toISOString(),
    ).toBe("2025-08-31T00:00:00.000Z")
  })

  it("rejects invalid IANA timezones", () => {
    expect(isValidTimeZone("Asia/Shanghai")).toBe(true)
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false)
    expect(() => parseRelativeDate("2h", "Mars/Olympus_Mons", referenceDate))
      .toThrow("Invalid IANA timezone: Mars/Olympus_Mons")
    expect(() => transformToUTC("2025-08-31 08:00", undefined, "Mars/Olympus_Mons"))
      .toThrow("Invalid IANA timezone: Mars/Olympus_Mons")
  })

  it("shifts nonexistent DST wall times forward", () => {
    const springForward = new Date("2025-03-09T12:00:00.000Z")

    expect(
      parseRelativeDate("Today 02:30", "America/New_York", springForward).toISOString(),
    ).toBe("2025-03-09T07:30:00.000Z")
  })

  it("selects the earlier occurrence of repeated DST wall times", () => {
    const fallBack = new Date("2025-11-02T12:00:00.000Z")

    expect(
      parseRelativeDate("Today 01:30", "America/New_York", fallBack).toISOString(),
    ).toBe("2025-11-02T05:30:00.000Z")
  })
})

describe("transform Beijing time to UTC in different timezone", () => {
  const a = "2024/10/3 12:26:16"
  const b = 1727929576000
  it("in UTC", () => {
    Object.assign(process.env, { TZ: "UTC" })
    const date = transformToUTC(a)
    expect(date).toBe(b)
  })

  it("in Beijing", () => {
    Object.assign(process.env, { TZ: "Asia/Shanghai" })
    const date = transformToUTC(a)
    expect(date).toBe(b)
  })

  it("in New York", () => {
    Object.assign(process.env, { TZ: "America/New_York" })
    const date = transformToUTC(a)
    expect(date).toBe(b)
  })
})
