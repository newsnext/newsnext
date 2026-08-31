import { atom, useAtomValue } from "jotai"
import { useMemo } from "react"
import { useI18n } from "@/hooks/use-i18n"

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
  return new Date(Math.max(lastTickAt, Date.now()))
}

minuteClockAtom.onMount = (setAtom) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const updateClock = () => setAtom(Date.now())

  const scheduleNextMinute = () => {
    if (timer !== undefined) clearTimeout(timer)
    const now = new Date()
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

export function formatRelativeTime(date: number, now: Date, locale = "en-US"): string {
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "always",
    style: "narrow",
  })
  const currentTimeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    style: "narrow",
  })
  const difference = date - now.getTime()
  const magnitude = Math.abs(difference)
  const unit = relativeTimeUnits.find(([milliseconds]) => magnitude >= milliseconds)

  if (!unit) return currentTimeFormatter.format(0, "second")

  const [milliseconds, name] = unit
  const value = Math.round(magnitude / milliseconds) * Math.sign(difference)
  return relativeTimeFormatter.format(value, name)
}

export function useMinuteDate(): Date {
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(() => sampleClock(lastTickAt), [lastTickAt])
}

export function useRelativeTime({ date }: { date: number }): string {
  const { locale } = useI18n()
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(
    () => formatRelativeTime(date, sampleClock(lastTickAt), locale),
    [date, lastTickAt, locale],
  )
}

export function useRelativeTimes(dates: readonly number[]): string[] {
  const { locale } = useI18n()
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(() => {
    const now = sampleClock(lastTickAt)
    return dates.map(date => formatRelativeTime(date, now, locale))
  }, [dates, lastTickAt, locale])
}

export function RelativeTime({ date }: { date: number }): string {
  return useRelativeTime({ date })
}
