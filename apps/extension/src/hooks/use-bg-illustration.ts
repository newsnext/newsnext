import { useEffect, useState } from "react"
import { actions } from "@/lib/actions"
import { subscribePersistedBgIllustration } from "@/lib/bg-illustration/persisted-illustration"

interface IllustrationState {
  id: string
  value: string | null
}

export function useBgIllustration(id: string | undefined): string | null {
  const [state, setState] = useState<IllustrationState | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }
    let cancelled = false
    const unsubscribe = subscribePersistedBgIllustration(id, (value) => {
      if (!cancelled) setState({ id, value })
    })
    void actions.illustration.get({ id }).then((value) => {
      if (!cancelled) setState({ id, value })
    }).catch((error) => {
      console.error("Failed to load background illustration", error)
      if (!cancelled) setState({ id, value: null })
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [id])

  return state !== null && state.id === id ? state.value : null
}
