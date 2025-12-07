import { throttle } from "es-toolkit/function"
import { useMemo, useRef } from "react"

type Fn = (...args: any[]) => any

interface Options {
  wait?: number
  leading?: boolean
  trailing?: boolean
}

interface ThrottleResult {
  run: Fn
  cancel: () => void
  flush: () => void
}

const useThrottleFn = (
  fn: Fn,
  options: Options = {
    wait: 1000,
    leading: true,
    trailing: true,
  },
): ThrottleResult => {
  const fnRef = useRef<Fn>(fn)
  fnRef.current = fn

  const wait = typeof options.wait === "number" ? options.wait : 1000
  const edges: Array<"leading" | "trailing"> = []
  if (options.leading !== false) edges.push("leading")
  if (options.trailing !== false) edges.push("trailing")

  const throttled = useMemo(() => {
    return throttle(
      (...args: any[]) => fnRef.current(...args),
      wait,
      { edges: edges as ["leading"] | ["trailing"] | ["leading", "trailing"] },
    )
  }, [wait, edges.join(",")])

  return {
    run: throttled,
    cancel: throttled.cancel,
    flush: throttled.flush,
  }
}

export default useThrottleFn
