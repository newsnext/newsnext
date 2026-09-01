import type { ChangeEvent } from "react"
import type { StaticMessageKey } from "@/lib/i18n"
import type { PersistedPortableSliceId } from "@/lib/settings"
import { Button } from "@newsnext/ui/components/button"
import { Checkbox } from "@newsnext/ui/components/checkbox"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useRef, useState } from "react"
import { ConfigSection } from "@/components/common/config-section"
import { ConfirmDestructiveButton } from "@/components/common/confirm-destructive-button"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"
import { DEFAULT_BOARD_COLOR } from "@/lib/board"
import { clearNonPortableUserData, hasPersistedUserDataSlice, parsePersistedDataExport, PERSISTED_PORTABLE_SLICE_IDS, selectPersistedUserData, serializePersistedDataExport } from "@/lib/settings"
import { handleThemeModeSwitch, handleThemeSwitch } from "@/lib/utils/swith-theme"
import {
  clearPersistedUserDataAtom,
  importPersistedUserDataAtom,
  persistedUserDataAtom,
} from "@/store/persisted-data"

const DATA_SLICE_OPTIONS: Array<{
  descriptionKey: StaticMessageKey
  id: PersistedPortableSliceId
  labelKey: StaticMessageKey
}> = [
  {
    id: "settings",
    labelKey: "settings",
    descriptionKey: "settingsDataDescription",
  },
  {
    id: "boards",
    labelKey: "boards",
    descriptionKey: "boardsDataDescription",
  },
  {
    id: "instances",
    labelKey: "liveCards",
    descriptionKey: "liveCardsDataDescription",
  },
]

interface TransferStatus {
  kind: "error" | "success"
  message: string
}

export function DataTransferSettings({
  onCleared,
}: {
  onCleared: () => void
}): React.JSX.Element {
  const { t } = useI18n()
  const data = useAtomValue(persistedUserDataAtom)
  const clearPersistedData = useSetAtom(clearPersistedUserDataAtom)
  const importData = useSetAtom(importPersistedUserDataAtom)
  const navigate = useNavigate()
  const { boardId: routeBoardId } = useParams({ strict: false }) as { boardId?: string }
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedSliceIds, setSelectedSliceIds] = useState<PersistedPortableSliceId[]>(
    () => [...PERSISTED_PORTABLE_SLICE_IDS],
  )
  const [status, setStatus] = useState<TransferStatus>()
  const {
    error: clearError,
    isPending: clearing,
    resetError: resetClearError,
    run: runClear,
  } = useAsyncAction(t("clearUserDataFailed"))
  const hasSelection = selectedSliceIds.length > 0

  function setSliceSelected(
    sliceId: PersistedPortableSliceId,
    selected: boolean,
  ): void {
    setSelectedSliceIds(current => selected
      ? current.includes(sliceId) ? current : [...current, sliceId]
      : current.filter(id => id !== sliceId))
    setStatus(undefined)
  }

  function handleExport(): void {
    const serialized = serializePersistedDataExport(data, selectedSliceIds)
    const url = URL.createObjectURL(new Blob([serialized], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `newsnext-data-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setStatus({
      kind: "success",
      message: t("exportedData", { items: formatSliceList(selectedSliceIds, t) }),
    })
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) {
      return
    }

    try {
      const imported = parsePersistedDataExport(await file.text())
      if (!imported) {
        setStatus({ kind: "error", message: t("invalidDataFile") })
        return
      }

      const selectedData = selectPersistedUserData(imported.data, selectedSliceIds)
      const importedSliceIds = selectedSliceIds.filter(id => hasPersistedUserDataSlice(selectedData, id))
      if (importedSliceIds.length === 0) {
        setStatus({
          kind: "error",
          message: t("selectedDataMissing"),
        })
        return
      }

      const nextData = await importData(selectedData)
      if (routeBoardId && !nextData.boards.some(board => board.id === routeBoardId)) {
        const fallbackBoardId = nextData.boards[0]?.id
        if (fallbackBoardId) {
          await navigate({
            to: "/board/$boardId",
            params: { boardId: fallbackBoardId },
            replace: true,
          })
        }
      }
      if (selectedData.settings) {
        handleThemeModeSwitch(selectedData.settings.appearance.themeMode)
      }
      setStatus({
        kind: "success",
        message: t("importedData", { items: formatSliceList(importedSliceIds, t) }),
      })
    } catch {
      setStatus({ kind: "error", message: t("readDataFailed") })
    } finally {
      input.value = ""
    }
  }

  async function handleClear(): Promise<void> {
    await runClear(async () => {
      await clearNonPortableUserData()
      const clearedData = await clearPersistedData(t("myBoard"))
      queryClient.clear()
      handleThemeModeSwitch("system")
      handleThemeSwitch(DEFAULT_BOARD_COLOR)
      const boardId = clearedData.boards[0]?.id
      if (!boardId) throw new Error("NewsNext must keep at least one Board")
      await navigate({
        to: "/board/$boardId",
        params: { boardId },
        replace: true,
      })
      onCleared()
    })
  }

  return (
    <div className="space-y-6">
      <ConfigSection
        title={t("importExport")}
        description={t("importExportDescription")}
        surfaceClassName="gap-5 p-4"
      >
        <div className="space-y-4">
          {DATA_SLICE_OPTIONS.map(option => (
            <label key={option.id} className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={selectedSliceIds.includes(option.id)}
                onCheckedChange={checked => setSliceSelected(option.id, checked)}
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">{t(option.labelKey)}</span>
                <span className="block text-sm leading-5 text-muted-foreground">
                  {t(option.descriptionKey)}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button type="button" size="sm" disabled={!hasSelection} onClick={handleExport}>
            {t("exportSelected")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasSelection}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("importSelected")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={event => void handleImport(event)}
          />
        </div>

        {status && (
          <p
            role={status.kind === "error" ? "alert" : "status"}
            className={status.kind === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"}
          >
            {status.message}
          </p>
        )}
      </ConfigSection>

      <ConfigSection
        title={t("clearData")}
        description={t("clearDataDescription")}
        surfaceClassName="p-4"
      >
        <ConfirmDestructiveButton
          type="button"
          size="sm"
          label={t("clearAllData")}
          confirmLabel={t("confirmClear")}
          pending={clearing}
          pendingLabel={t("clearing")}
          onArm={resetClearError}
          onConfirm={handleClear}
        />
        {clearError && (
          <p role="alert" className="text-sm text-destructive">
            {clearError}
          </p>
        )}
      </ConfigSection>
    </div>
  )
}

function formatSliceList(
  sliceIds: readonly PersistedPortableSliceId[],
  t: (key: StaticMessageKey) => string,
): string {
  return sliceIds
    .map((id) => {
      const labelKey = DATA_SLICE_OPTIONS.find(option => option.id === id)?.labelKey
      return labelKey ? t(labelKey) : id
    })
    .join(", ")
}
