import type { NativeLogEntry } from "@newsnext/extension-connection"
import type { NativeIntegrationStatus } from "@/lib/background/native-integration"
import type { StaticMessageKey } from "@/lib/i18n"
import { Button } from "@newsnext/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newsnext/ui/components/select"
import { Switch } from "@newsnext/ui/components/switch"
import { useCallback, useEffect, useMemo, useState } from "react"
import { browser } from "#imports"
import { ConfigSection } from "@/components/common/config-section"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"
import { actions } from "@/lib/actions"
import { NATIVE_INTEGRATION_PERMISSIONS } from "@/lib/background/native-integration/permission"

interface StatusPresentation {
  dotClassName: string
  labelKey: StaticMessageKey
}

const STATUS_PRESENTATION: Record<NativeIntegrationStatus["state"], StatusPresentation> = {
  disabled: { dotClassName: "bg-muted-foreground/50", labelKey: "disabled" },
  connected: { dotClassName: "bg-emerald-500", labelKey: "connected" },
  connecting: { dotClassName: "bg-amber-500", labelKey: "connecting" },
  daemonOutdated: { dotClassName: "bg-destructive", labelKey: "updateRequired" },
  hostNotInstalled: { dotClassName: "bg-destructive", labelKey: "nativeHostNotInstalled" },
  protocolIncompatible: { dotClassName: "bg-destructive", labelKey: "updateRequired" },
  serviceNotRunning: { dotClassName: "bg-destructive", labelKey: "serviceNotRunning" },
  workerConflict: { dotClassName: "bg-destructive", labelKey: "workerInUse" },
}

const CHECKING_PRESENTATION: StatusPresentation = {
  dotClassName: "bg-muted-foreground/50",
  labelKey: "checking",
}

export function NativeIntegrationSettings(): React.JSX.Element {
  const { t } = useI18n()
  const [status, setStatus] = useState<NativeIntegrationStatus>()
  const [logs, setLogs] = useState<NativeLogEntry[]>([])
  const [logLevel, setLogLevel] = useState<"all" | NativeLogEntry["level"]>("all")
  const { error: updateError, isPending: updating, run: runUpdate } = useAsyncAction(
    t("updateNativeIntegrationFailed"),
  )
  const state = status?.state
  const isEnabled = state !== undefined && state !== "disabled"
  const hasConnectionFailure = state !== undefined
    && !["disabled", "connected", "connecting"].includes(state)
  const presentation = state ? STATUS_PRESENTATION[state] : CHECKING_PRESENTATION

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      setStatus(await actions.appIntegration.getStatus())
    } catch {
      setStatus(undefined)
    }
  }, [])

  const refreshLogs = useCallback(async (): Promise<void> => {
    try {
      setLogs(await actions.appIntegration.getLogs())
    } catch {
      setLogs([])
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    void refreshLogs()
  }, [refreshLogs, refreshStatus])

  useEffect(() => {
    if (!isEnabled) {
      return
    }
    const timer = setInterval(() => {
      void refreshStatus()
      void refreshLogs()
    }, 1_000)
    return () => clearInterval(timer)
  }, [isEnabled, refreshLogs, refreshStatus])

  const filteredLogs = useMemo(() => (
    logs.filter(entry => logLevel === "all" || entry.level === logLevel).toReversed()
  ), [logLevel, logs])

  const handleEnabledChange = useCallback(async (enabled: boolean): Promise<void> => {
    const succeeded = await runUpdate(async () => {
      if (enabled) {
        const granted = await browser.permissions.request({
          permissions: [...NATIVE_INTEGRATION_PERMISSIONS],
        }).catch(() => false)
        if (!granted) return
      }

      setStatus(await actions.appIntegration.setEnabled({
        enabled,
      }))

      if (!enabled) {
        await browser.permissions.remove({
          permissions: [...NATIVE_INTEGRATION_PERMISSIONS],
        }).catch(() => false)
      }
    })
    if (!succeeded) {
      await refreshStatus()
    }
  }, [refreshStatus, runUpdate])

  const handleWorkerTakeover = useCallback(async (workerId: string): Promise<void> => {
    const succeeded = await runUpdate(async () => {
      const offlineWorker = status?.offlineWorkers.find(worker => worker.id === workerId)
      if (!offlineWorker) return
      setStatus(await actions.appIntegration.takeOverWorker({
        instanceIds: offlineWorker.instanceIds,
        workerId,
      }))
    })
    if (!succeeded) {
      await refreshStatus()
    }
  }, [refreshStatus, runUpdate, status?.offlineWorkers])

  const handleRegenerateWorker = useCallback(async (): Promise<void> => {
    const succeeded = await runUpdate(async () => {
      setStatus(await actions.appIntegration.regenerateWorker())
    })
    if (!succeeded) {
      await refreshStatus()
    }
  }, [refreshStatus, runUpdate])

  return (
    <div className="space-y-6">
      <ConfigSection
        title={t("integration")}
        description={t("nativeIntegrationDescription")}
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
            aria-label={t("enableNativeIntegration")}
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
          </div>
        )}

        {status && state === "connected" && status.offlineWorkers.length > 0 && (
          <div className="space-y-3 border-t pt-3">
            <p className="text-xs leading-5 text-muted-foreground">
              {t("offlineWorkerDescription")}
            </p>
            {status.offlineWorkers.map(offlineWorker => (
              <div key={offlineWorker.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{offlineWorker.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("offlineInstanceCount", { count: offlineWorker.instanceIds.length })}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={updating}
                  onClick={() => void handleWorkerTakeover(offlineWorker.id)}
                >
                  {t("takeOver")}
                </Button>
              </div>
            ))}
          </div>
        )}

        {hasConnectionFailure && (
          <div className="space-y-3 border-t pt-3">
            <p
              role="alert"
              className="text-xs leading-5 text-destructive"
            >
              {state === "workerConflict"
                ? t("workerAlreadyConnected")
                : state === "hostNotInstalled"
                  ? (
                      <>
                        {t("installNativeHost")}
                        {" "}
                        <code>newsnext install-native-host</code>
                        .
                      </>
                    )
                  : state === "protocolIncompatible"
                    ? t("protocolIncompatibleDescription")
                    : state === "daemonOutdated"
                      ? t("daemonOutdatedDescription")
                      : (
                          <>
                            {t("startLocalServer")}
                            {" "}
                            <code>newsnext start</code>
                            .
                          </>
                        )}
            </p>
            {state === "workerConflict" && (
              <Button
                type="button"
                size="sm"
                disabled={updating}
                onClick={() => void handleRegenerateWorker()}
              >
                {t("regenerateWorker")}
              </Button>
            )}
          </div>
        )}
        {updateError && (
          <p role="alert" className="text-xs text-destructive">
            {updateError}
          </p>
        )}
      </ConfigSection>
      {state === "connected" && (
        <ConfigSection
          title={t("appLogs")}
          description={t("appLogsDescription")}
          surfaceClassName="gap-3 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <Select value={logLevel} onValueChange={value => value && setLogLevel(value)}>
              <SelectTrigger size="sm" className="w-32" aria-label={t("filterLogs")}>
                <SelectValue>{t(logLevel === "all" ? "all" : logLevel)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(["all", "info", "warn", "error"] as const).map(level => (
                  <SelectItem key={level} value={level}>{t(level)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {t("appLogCount", { count: filteredLogs.length })}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-xl border bg-background/25">
            {filteredLogs.length === 0
              ? <p className="p-6 text-center text-xs text-muted-foreground">{t("noAppLogs")}</p>
              : filteredLogs.map(entry => (
                  <div key={entry.id} className="grid grid-cols-[4.5rem_3.5rem_minmax(0,1fr)] gap-2 border-b px-3 py-2 text-xs last:border-b-0">
                    <time className="text-muted-foreground" dateTime={entry.timestamp}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </time>
                    <span className={entry.level === "error" ? "text-destructive" : "text-muted-foreground"}>
                      {entry.level}
                    </span>
                    <span className="min-w-0">
                      <span className="mr-2 font-mono text-muted-foreground">{entry.target}</span>
                      <span className="break-words">{entry.message}</span>
                    </span>
                  </div>
                ))}
          </div>
        </ConfigSection>
      )}
    </div>
  )
}
