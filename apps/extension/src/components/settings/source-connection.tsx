import type { SourceConnectionStatus } from "@/lib/background/source-connection-websocket"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { Switch } from "@newsnext/ui/components/switch"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import { createBackgroundClient } from "@/lib/background"
import { withSourceConnectionEnabled } from "@/lib/settings"
import { persistedDeviceStateAtom } from "@/store/settings"
import { SettingsSection } from "./layout"

interface StatusPresentation {
  dotClassName: string
  label: string
}

const STATUS_PRESENTATION: Record<SourceConnectionStatus["state"], StatusPresentation> = {
  disabled: { dotClassName: "bg-muted-foreground/50", label: "Disabled" },
  connected: { dotClassName: "bg-emerald-500", label: "Connected" },
  connecting: { dotClassName: "bg-amber-500", label: "Connecting" },
  disconnected: { dotClassName: "bg-destructive", label: "Disconnected" },
}

const CHECKING_PRESENTATION: StatusPresentation = {
  dotClassName: "bg-muted-foreground/50",
  label: "Checking",
}

export function SourceConnectionSettings(): React.JSX.Element {
  const persistedDeviceState = useAtomValue(persistedDeviceStateAtom)
  const [status, setStatus] = useState<SourceConnectionStatus>()
  const [updating, setUpdating] = useState(false)
  const state = status?.state
  const isEnabled = state !== undefined && state !== "disabled"
  const presentation = state ? STATUS_PRESENTATION[state] : CHECKING_PRESENTATION

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
    if (!isEnabled) {
      return
    }
    const timer = setInterval(() => {
      void refreshStatus()
    }, 1_000)
    return () => clearInterval(timer)
  }, [isEnabled, refreshStatus])

  const handleEnabledChange = useCallback(async (enabled: boolean): Promise<void> => {
    setUpdating(true)
    try {
      const client = createBackgroundClient()
      setStatus(await client.sourceConnection.setEnabled(
        enabled,
        withSourceConnectionEnabled(persistedDeviceState, enabled),
      ))
    } catch {
      await refreshStatus()
    } finally {
      setUpdating(false)
    }
  }, [persistedDeviceState, refreshStatus])

  return (
    <SettingsSection
      title="CLI access"
      description="Allow the NewsNext CLI on this device to run sources in this browser."
    >
      <Card variant="subtle">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div
              className="flex min-w-0 items-center gap-2 text-sm font-medium"
              role="status"
              aria-live="polite"
            >
              <span
                aria-hidden="true"
                className={`size-2 shrink-0 rounded-full ${presentation.dotClassName}`}
              />
              <span>{presentation.label}</span>
              {state === "connected" && status?.cliVersion && (
                <span className="font-mono text-xs font-normal text-muted-foreground">
                  {`v${status.cliVersion}`}
                </span>
              )}
            </div>
            <Switch
              checked={isEnabled}
              disabled={!status || updating}
              aria-label="Enable CLI connection"
              onCheckedChange={enabled => void handleEnabledChange(enabled)}
            />
          </div>

          {state === "disconnected" && (
            <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground">
              Start the local server with
              {" "}
              <code>newsnext start</code>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </SettingsSection>
  )
}
