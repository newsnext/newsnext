import type { SourceConnectionStatus } from "@/lib/background/source-connection-websocket"
import { useCallback, useEffect, useState } from "react"
import { createBackgroundClient } from "@/lib/background-client"

const STATUS_LABELS: Record<SourceConnectionStatus["state"], string> = {
  connected: "Connected",
  connecting: "Connecting",
  disconnected: "Disconnected",
}

const STATUS_DOT_CLASSES: Record<SourceConnectionStatus["state"], string> = {
  connected: "bg-emerald-500",
  connecting: "bg-amber-500",
  disconnected: "bg-destructive",
}

export function SourceConnectionSettings(): React.JSX.Element {
  const [status, setStatus] = useState<SourceConnectionStatus>()

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const client = createBackgroundClient()
      const nextStatus = await client?.sourceConnection.getStatus()
      if (nextStatus) {
        setStatus(nextStatus)
      }
    } catch {
      setStatus(undefined)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    const timer = setInterval(() => {
      void refreshStatus()
    }, 1_000)
    return () => clearInterval(timer)
  }, [refreshStatus])

  const state = status?.state
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Source Connection</h3>
        <p className="text-sm text-muted-foreground">
          Connection between this extension and the NewsNext CLI.
        </p>
      </div>

      <div className="rounded-xl border p-4" role="status" aria-live="polite">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${state ? STATUS_DOT_CLASSES[state] : "bg-muted-foreground/50"}`}
            />
            {state ? STATUS_LABELS[state] : "Checking"}
          </div>
          {status?.connectedAt && (
            <span className="text-xs text-muted-foreground">
              Since
              {" "}
              {new Date(status.connectedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {status && (
          <div className="mt-3 break-all font-mono text-xs text-muted-foreground">
            {status.url}
          </div>
        )}
        {state === "disconnected" && (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            The CLI is not listening. Run
            {" "}
            <code>newsnext source run &lt;source-id|provider.json&gt;</code>
            .
          </p>
        )}
      </div>
    </section>
  )
}
