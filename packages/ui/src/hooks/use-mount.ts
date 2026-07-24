import type { EffectCallback } from "react"
import { useLatest } from "@newsnext/ui/hooks/use-latest"
import { useEffect } from "react"

type MountCallback = EffectCallback | (() => Promise<void | (() => void)>)

export function useMount(fn: MountCallback) {
  const fnRef = useLatest(fn)

  useEffect(() => {
    const result = fnRef.current()
    // If fn returns a Promise, don't return it as cleanup function
    if (
      result
      && typeof result === "object"
      && typeof (result as any).then === "function"
    ) {
      return
    }

    return result as ReturnType<EffectCallback>
  }, [fnRef])
}
