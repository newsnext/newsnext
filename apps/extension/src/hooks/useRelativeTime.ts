import { atom, useAtomValue } from "jotai"
import { useMemo } from "react"
import { useI18n } from "@/hooks/use-i18n"

// Ticks once per minute; subscribe only in leaf text components (RelativeTime/Timeline).
const minuteClockAtom = atom(Date.now())
const relativeTimeUnits = [
  [365 * 24 * 60 * 60 * 1000, "year"],
  [30 * 24 * 60 * 60 * 1000, "month"],
  [7 * 24 * 60 * 60 * 1000, "week"],
  [24 * 60 * 60 * 1000, "day"],
  [60 * 60 * 1000, "hour"],
  [60 * 1000, "minute"],
] as const

function sampleClock(lastTickAt: number): Date {
  // Clamp to Date.now(): a sleeping laptop can deliver a stale tick newer than nothing but older than now.
  return new Date(Math.max(lastTickAt, Date.now()))
}

minuteClockAtom.onMount = (setAtom) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const updateClock = () => setAtom(Date.now())

  const scheduleNextMinute = () => {
    if (timer !== undefined) clearTimeout(timer)
    const now = new Date()
    // +100ms pushes the timeout just past the minute edge; exact alignment risks firing in the previous minute.
    const msToNextMinute
      = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 100

    timer = setTimeout(() => {
      updateClock()
      scheduleNextMinute()
    }, msToNextMinute)
  }

  const syncClock = () => {
    updateClock()
    scheduleNextMinute()
  }
  const syncVisibleClock = () => {
    if (document.visibilityState === "visible") syncClock()
  }

  syncClock()
  document.addEventListener("visibilitychange", syncVisibleClock)
  window.addEventListener("focus", syncClock)
  window.addEventListener("pageshow", syncClock)

  return () => {
    if (timer !== undefined) clearTimeout(timer)
    document.removeEventListener("visibilitychange", syncVisibleClock)
    window.removeEventListener("focus", syncClock)
    window.removeEventListener("pageshow", syncClock)
  }
}

export function formatRelativeTime(
  date: number,
  now: Date,
  locale = "en-US",
  justNow = "Just now",
): string {
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "always",
    style: "narrow",
  })
  const difference = date - now.getTime()
  const magnitude = Math.abs(difference)
  const unit = relativeTimeUnits.find(([milliseconds]) => magnitude >= milliseconds)

  if (!unit) return justNow

  const [milliseconds, name] = unit
  const value = Math.round(magnitude / milliseconds) * Math.sign(difference)
  const formatted = relativeTimeFormatter.format(value, name)
  // CLDR spacing differs by locale and ICU version (zh-CN omits the space,
  // zh-TW includes it in some runtimes): normalize Chinese output to always
  // use a single space between the number and the unit.
  if (locale.startsWith("zh")) return formatted.replace(/^(\d+)\s*/, "$1 ")
  return formatted
}

export function useMinuteDate(): Date {
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(() => sampleClock(lastTickAt), [lastTickAt])
}

export function useRelativeTime({ date }: { date: number }): string {
  const { locale, t } = useI18n()
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(
    () => formatRelativeTime(date, sampleClock(lastTickAt), locale, t("justNow")),
    [date, lastTickAt, locale, t],
  )
}

export function useRelativeTimes(dates: readonly number[]): string[] {
  const { locale, t } = useI18n()
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(() => {
    const now = sampleClock(lastTickAt)
    const justNow = t("justNow")
    return dates.map(date => formatRelativeTime(date, now, locale, justNow))
  }, [dates, lastTickAt, locale, t])
}

export function RelativeTime({ date }: { date: number }): string {
  return useRelativeTime({ date })
}
