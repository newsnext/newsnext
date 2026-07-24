import { formatDistance } from "date-fns"
import { enUS } from "date-fns/locale"
import { atom, useAtomValue } from "jotai"
import { useMemo } from "react"

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

export function useRelativeTime({ date }: { date: number }) {
  const now = useAtomValue(minuteDateAtom)
  const result = useMemo(() => formatDistance(new Date(date), now, {
    addSuffix: true,
    locale: enUS,
  }), [date, now])
  return result
}
