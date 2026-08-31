import type { AppIntegrationStatus } from "@/lib/background/app-integration-native"
import type { StaticMessageKey } from "@/lib/i18n"
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
import { useI18n } from "@/hooks/use-i18n"
import { actions } from "@/lib/actions"

interface StatusPresentation {
  dotClassName: string
  labelKey: StaticMessageKey
}

const STATUS_PRESENTATION: Record<AppIntegrationStatus["state"], StatusPresentation> = {
  disabled: { dotClassName: "bg-muted-foreground/50", labelKey: "disabled" },
  connected: { dotClassName: "bg-emerald-500", labelKey: "connected" },
  connecting: { dotClassName: "bg-amber-500", labelKey: "connecting" },
  disconnected: { dotClassName: "bg-destructive", labelKey: "disconnected" },
}

const CHECKING_PRESENTATION: StatusPresentation = {
  dotClassName: "bg-muted-foreground/50",
  labelKey: "checking",
}

export function AppIntegrationSettings(): React.JSX.Element {
  const { t } = useI18n()
  const [status, setStatus] = useState<AppIntegrationStatus>()
  const { error: updateError, isPending: updating, run: runUpdate } = useAsyncAction(
    t("updateAppIntegrationFailed"),
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
      title={t("integration")}
      description={t("appIntegrationDescription")}
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
          <span>{t(presentation.labelKey)}</span>
          {state === "connected" && status?.appVersion && (
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {`v${status.appVersion}`}
            </span>
          )}
        </div>
        <Switch
          checked={isEnabled}
          disabled={!status || updating}
          aria-label={t("enableAppIntegration")}
          onCheckedChange={enabled => void handleEnabledChange(enabled)}
        />
      </div>

      {status && isEnabled && (
        <div className="flex items-center justify-between gap-4 border-t pt-3">
          <div className="min-w-0">
            <p className="text-xs font-medium">{t("worker")}</p>
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
                aria-label={t("selectWorker")}
              >
                <SelectValue>{status.workerId.slice(0, 8)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={status.workerId}>
                  {`${t("current")} · ${status.workerId.slice(0, 8)}`}
                </SelectItem>
                {status.claimableWorkerIds.map(workerId => (
                  <SelectItem key={workerId} value={workerId}>
                    {`${t("restore")} · ${workerId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {status && status.claimableWorkerIds.length > 0 && (
        <p className="text-xs leading-5 text-muted-foreground">
          {t("restoreWorkerDescription")}
        </p>
      )}

      {state === "disconnected" && (
        <p className="border-t pt-3 text-xs leading-5 text-muted-foreground">
          {t("startLocalServer")}
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
