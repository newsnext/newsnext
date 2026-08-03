import { formatDistance } from "date-fns"
import { enUS } from "date-fns/locale"
import { atom, useAtomValue } from "jotai"

/**
 * changed only every minute
 */
export const minuteDateAtom = atom(new Date())

minuteDateAtom.onMount = (setAtom) => {
  // Update immediately to ensure we don't have a stale date from module load time
  setAtom(new Date())

  let timer: ReturnType<typeof setTimeout>

  const loop = () => {
    const now = new Date()
    // Align with the next minute, add 100ms buffer to ensure we are in the next minute
    const msToNextMinute
      = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 100

    timer = setTimeout(() => {
      setAtom(new Date())
      loop()
    }, msToNextMinute)
  }

  loop()

  return () => clearTimeout(timer)
}

export function formatRelativeTime(date: number, now: Date): string {
  return formatDistance(new Date(date), now, {
    addSuffix: true,
    locale: enUS,
  })
}

export function useRelativeTime({ date }: { date: number }): string {
  const now = useAtomValue(minuteDateAtom)
  return formatRelativeTime(date, now)
}

export function RelativeTime({ date }: { date: number }): string {
  return useRelativeTime({ date })
}
