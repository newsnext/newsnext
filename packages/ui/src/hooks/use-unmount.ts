import { useLatest } from "@newsnext/ui/hooks/use-latest"
import { useEffect } from "react"

export function useUnmount(fn: () => void) {
  const fnRef = useLatest(fn)

  useEffect(
    () => () => {
      fnRef.current()
    },
    [],
  )
}
