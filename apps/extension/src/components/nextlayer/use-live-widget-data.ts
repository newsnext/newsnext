import type { LiveWidgetDataResult } from "@newsnext/sdk/extension"
import { createClient } from "@newsnext/sdk/extension"
import { useEffect, useRef, useState } from "react"
import { waitForMinimumManualRequestFeedback } from "@/lib/manual-request-feedback"

const client = createClient()

interface WidgetDataInput {
  params: Record<string, unknown>
  widgetId: string
  cardIds: string[]
  dataRevision: string
  refreshIntervalMs: number
}

interface WidgetDataState {
  key: string
  data?: LiveWidgetDataResult
  error?: Error
  isFetching: boolean
  isContentFetching: boolean
}

interface WidgetDataView {
  data?: LiveWidgetDataResult
  error?: Error
  isFetching: boolean
  isContentFetching: boolean
  refetch: () => void
}

export function useLiveWidgetData(input: WidgetDataInput, active: boolean): WidgetDataView {
  const { widgetId, dataRevision, refreshIntervalMs } = input
  const scope = JSON.stringify([...input.cardIds].sort())
  const params = JSON.stringify(input.params)
  const key = JSON.stringify([widgetId, scope, dataRevision, params])
  const [state, setState] = useState<WidgetDataState>({ key, isFetching: false, isContentFetching: false })
  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    let pending = false
    async function read(manual = false): Promise<void> {
      if (pending || controller.signal.aborted) return
      const startedAt = Date.now()
      pending = true
      setState(previous => ({ ...(previous.key === key ? previous : { key }), isFetching: true, isContentFetching: manual || previous.key !== key || !previous.data }))
      try {
        const data = await client.liveWidgets.data({ widgetId, cardIds: JSON.parse(scope), params: JSON.parse(params) }, { signal: controller.signal })
        if (!controller.signal.aborted) setState({ key, data, isFetching: manual, isContentFetching: manual })
      } catch (error) {
        if (!controller.signal.aborted) {
          setState(previous => ({
            ...(previous.key === key ? previous : { key }),
            error: error instanceof Error ? error : new Error("Widget data request failed"),
            isFetching: manual,
            isContentFetching: manual,
          }))
        }
      } finally {
        if (manual) {
          await waitForMinimumManualRequestFeedback(startedAt)
          if (!controller.signal.aborted) {
            setState(previous => previous.key === key ? { ...previous, isFetching: false, isContentFetching: false } : previous)
          }
        }
        pending = false
      }
    }
    refreshRef.current = () => {
      void read(true)
    }
    void read()
    const timer = setInterval(() => {
      void read()
    }, refreshIntervalMs)
    return () => {
      controller.abort()
      clearInterval(timer)
      refreshRef.current = () => {}
    }
  }, [active, key, widgetId, scope, params, refreshIntervalMs])

  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    isFetching: active && state.key === key && state.isFetching,
    isContentFetching: active && (state.key !== key || state.isContentFetching || (!state.data && !state.error)),
    refetch: () => refreshRef.current(),
  }
}
