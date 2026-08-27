import type { AppIntegrationStatus } from "@/lib/background/app-integration-native"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newsnext/ui/components/select"
import { Switch } from "@newsnext/ui/components/switch"
import { useCallback, useEffect, useState } from "react"
import { ConfigSection } from "@/components/common/config-section"
import { useAsyncAction } from "@/hooks/use-async-action"
import { actions } from "@/lib/actions"

interface StatusPresentation {
  dotClassName: string
  label: string
}

const STATUS_PRESENTATION: Record<AppIntegrationStatus["state"], StatusPresentation> = {
  disabled: { dotClassName: "bg-muted-foreground/50", label: "Disabled" },
  connected: { dotClassName: "bg-emerald-500", label: "Connected" },
  connecting: { dotClassName: "bg-amber-500", label: "Connecting" },
  disconnected: { dotClassName: "bg-destructive", label: "Disconnected" },
}

const CHECKING_PRESENTATION: StatusPresentation = {
  dotClassName: "bg-muted-foreground/50",
  label: "Checking",
}

export function AppIntegrationSettings(): React.JSX.Element {
  const [status, setStatus] = useState<AppIntegrationStatus>()
  const { error: updateError, isPending: updating, run: runUpdate } = useAsyncAction(
    "NewsNext could not update the App integration.",
  )
  const state = status?.state
  const isEnabled = state !== undefined && state !== "disabled"
  const presentation = state ? STATUS_PRESENTATION[state] : CHECKING_PRESENTATION

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      setStatus(await actions.appIntegration.getStatus())
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
    const succeeded = await runUpdate(async () => {
      setStatus(await actions.appIntegration.setEnabled({
        enabled,
      }))
    })
    if (!succeeded) {
      await refreshStatus()
    }
  }, [refreshStatus, runUpdate])

  const handleWorkerChange = useCallback(async (workerId: string | null): Promise<void> => {
    if (!workerId || workerId === status?.workerId) {
      return
    }
    const succeeded = await runUpdate(async () => {
      setStatus(await actions.appIntegration.setWorker({ workerId }))
    })
    if (!succeeded) {
      await refreshStatus()
    }
  }, [refreshStatus, runUpdate, status?.workerId])

  return (
    <ConfigSection
      title="Integration"
      description="Connect this browser to the NewsNext App for local data, widgets, and CLI access."
      surfaceClassName="gap-3 p-4"
    >
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
          {state === "connected" && status?.appVersion && (
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {`v${status.appVersion}`}
            </span>
          )}
        </div>
        <Switch
          checked={isEnabled}
          disabled={!status || updating}
          aria-label="Enable NewsNext App integration"
          onCheckedChange={enabled => void handleEnabledChange(enabled)}
        />
      </div>

      {status && isEnabled && (
        <div className="flex items-center justify-between gap-4 border-t pt-3">
          <div className="min-w-0">
            <p className="text-xs font-medium">Worker</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {status.workerId}
            </p>
          </div>
          {status.claimableWorkerIds.length > 0 && (
            <Select value={status.workerId} onValueChange={handleWorkerChange}>
              <SelectTrigger
                size="sm"
                className="max-w-52"
                disabled={updating}
                aria-label="Select NewsNext Worker"
              >
                <SelectValue>{status.workerId.slice(0, 8)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={status.workerId}>
                  {`Current · ${status.workerId.slice(0, 8)}`}
                </SelectItem>
                {status.claimableWorkerIds.map(workerId => (
                  <SelectItem key={workerId} value={workerId}>
                    {`Restore · ${workerId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {status && status.claimableWorkerIds.length > 0 && (
        <p className="text-xs leading-5 text-muted-foreground">
          Restore a previous Worker if this extension was reinstalled and lost its local identity.
        </p>
      )}

      {state === "disconnected" && (
        <p className="border-t pt-3 text-xs leading-5 text-muted-foreground">
          Start the local server with
          {" "}
          <code>newsnext start</code>
          .
        </p>
      )}
      {updateError && (
        <p role="alert" className="text-xs text-destructive">
          {updateError}
        </p>
      )}
    </ConfigSection>
  )
}
