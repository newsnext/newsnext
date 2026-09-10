import type { WidgetDataResult } from "@newsnext/sdk/extension"
import { createClient } from "@newsnext/sdk/extension"
import { useEffect, useRef, useState } from "react"

const client = createClient()

interface WidgetDataInput {
  widgetId: string
  instanceIds: string[]
  dataRevision: string
  refreshIntervalMs: number
}

interface WidgetDataState {
  key: string
  data?: WidgetDataResult
  error?: Error
  isFetching: boolean
}

interface WidgetDataView {
  data?: WidgetDataResult
  error?: Error
  isFetching: boolean
  refetch: () => void
}

export function useWidgetData(input: WidgetDataInput, active: boolean): WidgetDataView {
  const { widgetId, dataRevision, refreshIntervalMs } = input
  const scope = JSON.stringify([...input.instanceIds].sort())
  const key = JSON.stringify([widgetId, scope, dataRevision])
  const [state, setState] = useState<WidgetDataState>({ key, isFetching: false })
  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    let pending = false
    async function read(): Promise<void> {
      if (pending || controller.signal.aborted) return
      pending = true
      setState(previous => ({ ...(previous.key === key ? previous : { key }), isFetching: true }))
      try {
        const data = await client.widgets.data({ widgetId, instanceIds: JSON.parse(scope) }, { signal: controller.signal })
        if (!controller.signal.aborted) setState({ key, data, isFetching: false })
      } catch (error) {
        if (!controller.signal.aborted) {
          setState(previous => ({
            ...(previous.key === key ? previous : { key }),
            error: error instanceof Error ? error : new Error("Widget data request failed"),
            isFetching: false,
          }))
        }
      } finally {
        pending = false
      }
    }
    refreshRef.current = () => {
      void read()
    }
    void read()
    const timer = setInterval(refreshRef.current, refreshIntervalMs)
    return () => {
      controller.abort()
      clearInterval(timer)
      refreshRef.current = () => {}
    }
  }, [active, key, widgetId, scope, refreshIntervalMs])

  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    isFetching: active && state.key === key && state.isFetching,
    refetch: () => refreshRef.current(),
  }
}
