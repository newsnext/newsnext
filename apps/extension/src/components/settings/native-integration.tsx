import type { WorkspaceResolution } from "@newsnext/sdk/models"
import type { NativeIntegrationStatus } from "@/lib/background/native-integration"
import type { StaticMessageKey } from "@/lib/i18n"
import type { LogEntry as NativeLogEntry } from "@/lib/native-protocol/LogEntry"
import { Button } from "@newsnext/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newsnext/ui/components/select"
import { Switch } from "@newsnext/ui/components/switch"
import { overlayScrollbarsRef } from "@newsnext/ui/hooks/use-overlay-scrollbars"
import { useAtomValueRawSync } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import { browser } from "#imports"
import { ConfigSection } from "@/components/common/config-section"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"
import { actions } from "@/lib/actions"
import { NATIVE_INTEGRATION_PERMISSIONS } from "@/lib/background/native-integration/permission"
import { nativeIntegrationEnabledAtom } from "@/store/settings"

interface StatusPresentation {
  dotClassName: string
  labelKey: StaticMessageKey
}

const STATUS_PRESENTATION: Record<NativeIntegrationStatus["state"], StatusPresentation> = {
  disabled: { dotClassName: "bg-muted-foreground/50", labelKey: "disabled" },
  connected: { dotClassName: "bg-emerald-500", labelKey: "connected" },
  workspaceConflict: { dotClassName: "bg-amber-500", labelKey: "workspaceChoiceRequired" },
  connecting: { dotClassName: "bg-amber-500", labelKey: "connecting" },
  daemonOutdated: { dotClassName: "bg-destructive", labelKey: "updateRequired" },
  hostNotInstalled: { dotClassName: "bg-destructive", labelKey: "nativeHostNotInstalled" },
  protocolIncompatible: { dotClassName: "bg-destructive", labelKey: "updateRequired" },
  daemonStartFailed: { dotClassName: "bg-destructive", labelKey: "daemonStartFailed" },
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
  const [resolution, setResolution] = useState<WorkspaceResolution>("merge")
  const [logs, setLogs] = useState<NativeLogEntry[]>([])
  const [logLevel, setLogLevel] = useState<"all" | NativeLogEntry["level"]>("all")
  const { error: updateError, isPending: updating, run: runUpdate } = useAsyncAction(
    t("updateNativeIntegrationFailed"),
  )
  const { error: toggleError, isPending: toggling, run: runToggle } = useAsyncAction(
    t("updateNativeIntegrationFailed"),
  )
  const state = status?.state
  const isEnabled = useAtomValueRawSync(nativeIntegrationEnabledAtom)
  const hasConnectionGuidance = state !== undefined
    && ["workerConflict", "hostNotInstalled", "protocolIncompatible", "daemonOutdated", "serviceNotRunning"].includes(state)
  const presentation = state ? STATUS_PRESENTATION[state] : CHECKING_PRESENTATION

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      setStatus(await actions.nativeIntegration.getStatus())
    } catch {
      setStatus(undefined)
    }
  }, [])

  const refreshLogs = useCallback(async (): Promise<void> => {
    try {
      setLogs(await actions.nativeIntegration.getLogs())
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
    const succeeded = await runToggle(async () => {
      if (enabled) {
        const granted = await browser.permissions.request({
          permissions: [...NATIVE_INTEGRATION_PERMISSIONS],
        }).catch(() => false)
        if (!granted) return
      }

      setStatus(await actions.nativeIntegration.setEnabled({
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
  }, [refreshStatus, runToggle])

  const handleWorkerTakeover = useCallback(async (workerId: string): Promise<void> => {
    const succeeded = await runUpdate(async () => {
      const offlineWorker = status?.offlineWorkers.find(worker => worker.id === workerId)
      if (!offlineWorker) return
      setStatus(await actions.worker.takeOver({
        cardIds: offlineWorker.cardIds,
        workerId,
      }))
    })
    if (!succeeded) {
      await refreshStatus()
    }
  }, [refreshStatus, runUpdate, status?.offlineWorkers])

  const handleRegenerateWorker = useCallback(async (): Promise<void> => {
    const succeeded = await runUpdate(async () => {
      setStatus(await actions.worker.regenerateIdentity())
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
            {state === "connected" && status?.daemonVersion && (
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {`v${status.daemonVersion}`}
              </span>
            )}
          </div>
          <Switch
            checked={isEnabled}
            disabled={toggling}
            aria-label={t("enableNativeIntegration")}
            onCheckedChange={enabled => void handleEnabledChange(enabled)}
          />
        </div>

        {isEnabled && status?.workspaceConflict && (
          <div className="space-y-3 border-t pt-3">
            <p className="text-sm font-medium">{t("workspaceChoiceRequired")}</p>
            <p className="text-xs leading-5 text-muted-foreground">{t("workspaceChoiceDescription")}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt>{t("workspaceLocal")}</dt>
              <dd>{t("workspaceCounts", { ...status.workspaceConflict.local })}</dd>
              <dt>{t("workspaceShared")}</dt>
              <dd>{t("workspaceCounts", { ...status.workspaceConflict.shared })}</dd>
            </dl>
            <fieldset disabled={updating} className="space-y-2">
              <legend className="sr-only">{t("workspaceChoiceRequired")}</legend>
              {(["merge", "overwrite", "discard"] as const).map(option => (
                <label key={option} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-xs">
                  <input type="radio" name="workspace-resolution" value={option} checked={resolution === option} onChange={() => setResolution(option)} className="mt-0.5" />
                  <span className="space-y-1">
                    <span className="block font-medium">{t(option === "merge" ? "workspaceMerge" : option === "overwrite" ? "workspaceOverwrite" : "workspaceDiscard")}</span>
                    <span className="block leading-5 text-muted-foreground">{t(option === "merge" ? "workspaceMergeDescription" : option === "overwrite" ? "workspaceOverwriteDescription" : "workspaceDiscardDescription")}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Button
              size="sm"
              disabled={updating}
              onClick={() => {
                const conflict = status.workspaceConflict
                if (!conflict) return
                void runUpdate(async () => {
                  setStatus(await actions.nativeIntegration.resolveWorkspace({ resolution, expectedRevision: conflict.revision }))
                }).then(() => refreshStatus())
              }}
            >
              {t("workspaceApplyChoice")}
            </Button>
          </div>
        )}

        {isEnabled && status?.connectionError && (
          <p role="alert" className="whitespace-pre-wrap wrap-anywhere text-xs leading-5 text-destructive">
            {status.connectionError.message}
          </p>
        )}

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
                    {t("offlineLiveCardCount", { count: offlineWorker.cardIds.length })}
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

        {hasConnectionGuidance && (
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
        {(toggleError || updateError) && (
          <p role="alert" className="text-xs text-destructive">
            {toggleError || updateError}
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
          <div ref={overlayScrollbarsRef} className="max-h-72 overflow-y-auto rounded-xl border bg-background/25">
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
