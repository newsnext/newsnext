import { useIsomorphicLayoutEffect } from "@newsnext/ui/hooks/use-isomorphic-layout-effect"
import { useRef } from "react"

export function useLatest<T>(value: T) {
  const ref = useRef(value)

  useIsomorphicLayoutEffect(() => {
    ref.current = value
  })

  return ref
}
