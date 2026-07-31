import type { SourceConnectionStatus } from "@/lib/background/source-connection-websocket"
import { Switch } from "@newsnext/ui/components/switch"
import { useCallback, useEffect, useState } from "react"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { createBackgroundClient } from "@/lib/background-client"

const STATUS_LABELS: Record<SourceConnectionStatus["state"], string> = {
  disabled: "Disabled",
  connected: "Connected",
  connecting: "Connecting",
  disconnected: "Disconnected",
}

const STATUS_DOT_CLASSES: Record<SourceConnectionStatus["state"], string> = {
  disabled: "bg-muted-foreground/50",
  connected: "bg-emerald-500",
  connecting: "bg-amber-500",
  disconnected: "bg-destructive",
}

export function SourceConnectionSettings(): React.JSX.Element {
  const [status, setStatus] = useState<SourceConnectionStatus>()
  const [updating, setUpdating] = useState(false)

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const client = createBackgroundClient()
      setStatus(await client.sourceConnection.getStatus())
    } catch {
      setStatus(undefined)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    if (!status?.enabled) {
      return
    }
    const timer = setInterval(() => {
      void refreshStatus()
    }, 1_000)
    return () => clearInterval(timer)
  }, [refreshStatus, status?.enabled])

  const handleEnabledChange = useCallback(async (enabled: boolean): Promise<void> => {
    setUpdating(true)
    try {
      const client = createBackgroundClient()
      setStatus(await client.sourceConnection.setEnabled(enabled))
    } catch {
      await refreshStatus()
    } finally {
      setUpdating(false)
    }
  }, [refreshStatus])

  const state = status?.state
  const connectedRelativeTime = useRelativeTime({
    date: status?.connectedAt ?? 0,
  })
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">CLI Connection</h3>
        <p className="text-sm text-muted-foreground">
          Connection between this extension and the NewsNext CLI.
        </p>
      </div>

      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <label htmlFor="source-connection-enabled" className="text-sm font-medium">
              Enable CLI connection
            </label>
            <p id="source-connection-description" className="mt-1 text-xs leading-5 text-muted-foreground">
              Allow the NewsNext CLI on this device to run sources in this browser.
            </p>
          </div>
          <Switch
            id="source-connection-enabled"
            checked={status?.enabled ?? false}
            disabled={!status || updating}
            aria-describedby="source-connection-description"
            onCheckedChange={enabled => void handleEnabledChange(enabled)}
          />
        </div>

        <div
          className="mt-4 border-t pt-3"
          role="status"
          aria-live="polite"
        >
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
                {connectedRelativeTime}
              </span>
            )}
          </div>

          {status?.enabled && (
            <div className="mt-3 break-all font-mono text-xs text-muted-foreground">
              {status.url}
            </div>
          )}
          {state === "disabled" && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Local CLI access stays off until you enable it here.
            </p>
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
      </div>
    </section>
  )
}
