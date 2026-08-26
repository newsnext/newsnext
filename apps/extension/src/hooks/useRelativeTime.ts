import { formatDistance } from "date-fns"
import { enUS } from "date-fns/locale"
import { atom, useAtomValue } from "jotai"
import { useMemo } from "react"

const minuteClockAtom = atom(Date.now())

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

function formatRelativeTime(date: number, now: Date): string {
  return formatDistance(new Date(date), now, {
    addSuffix: true,
    locale: enUS,
  })
}

export function useMinuteDate(): Date {
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(() => sampleClock(lastTickAt), [lastTickAt])
}

export function useRelativeTime({ date }: { date: number }): string {
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(
    () => formatRelativeTime(date, sampleClock(lastTickAt)),
    [date, lastTickAt],
  )
}

export function useRelativeTimes(dates: readonly number[]): string[] {
  const lastTickAt = useAtomValue(minuteClockAtom)
  return useMemo(() => {
    const now = sampleClock(lastTickAt)
    return dates.map(date => formatRelativeTime(date, now))
  }, [dates, lastTickAt])
}

export function RelativeTime({ date }: { date: number }): string {
  return useRelativeTime({ date })
}
