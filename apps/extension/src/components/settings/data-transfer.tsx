import type { ChangeEvent } from "react"
import type { PersistedPortableSliceId } from "@/lib/settings"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { Checkbox } from "@newsnext/ui/components/checkbox"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useRef, useState } from "react"
import { PhCheckCircle, PhTrash } from "@/components/icons/ph"
import { useAsyncAction } from "@/hooks/use-async-action"
import { ALL_BOARD_ID, DEFAULT_BOARD_COLOR } from "@/lib/board"
import { clearNonPortableUserData, hasPersistedUserDataSlice, parsePersistedDataExport, PERSISTED_PORTABLE_SLICE_IDS, selectPersistedUserData, serializePersistedDataExport } from "@/lib/settings"
import { handleThemeModeSwitch, handleThemeSwitch } from "@/lib/utils/swith-theme"
import {
  clearPersistedUserDataAtom,
  importPersistedUserDataAtom,
  persistedUserDataAtom,
} from "@/store/persisted-data"
import { SettingsSection } from "./layout"

const DATA_SLICE_OPTIONS: Array<{
  description: string
  id: PersistedPortableSliceId
  label: string
}> = [
  {
    id: "settings",
    label: "Settings",
    description: "Appearance, default board, and source icon preferences.",
  },
  {
    id: "boards",
    label: "Boards",
    description: "Collections, Board preferences, memberships, and card order.",
  },
  {
    id: "instances",
    label: "Source instances",
    description: "Configured Source Instances and their parameters.",
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
  const data = useAtomValue(persistedUserDataAtom)
  const clearPersistedData = useSetAtom(clearPersistedUserDataAtom)
  const importData = useSetAtom(importPersistedUserDataAtom)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedSliceIds, setSelectedSliceIds] = useState<PersistedPortableSliceId[]>(
    () => [...PERSISTED_PORTABLE_SLICE_IDS],
  )
  const [status, setStatus] = useState<TransferStatus>()
  const [clearArmed, setClearArmed] = useState(false)
  const {
    error: clearError,
    isPending: clearing,
    resetError: resetClearError,
    run: runClear,
  } = useAsyncAction("NewsNext could not clear all user data.")
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
      message: `Exported ${formatSliceList(selectedSliceIds)}.`,
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
        setStatus({ kind: "error", message: "This is not a valid NewsNext data file." })
        return
      }

      const selectedData = selectPersistedUserData(imported.data, selectedSliceIds)
      const importedSliceIds = selectedSliceIds.filter(id => hasPersistedUserDataSlice(selectedData, id))
      if (importedSliceIds.length === 0) {
        setStatus({
          kind: "error",
          message: "The file does not contain any of the selected data.",
        })
        return
      }

      await importData(selectedData)
      if (selectedData.settings) {
        handleThemeModeSwitch(selectedData.settings.appearance.themeMode)
      }
      setStatus({
        kind: "success",
        message: `Imported ${formatSliceList(importedSliceIds)}.`,
      })
    } catch {
      setStatus({ kind: "error", message: "NewsNext could not read this file." })
    } finally {
      input.value = ""
    }
  }

  async function handleClear(): Promise<void> {
    if (!clearArmed) {
      setClearArmed(true)
      resetClearError()
      return
    }

    await runClear(async () => {
      await clearNonPortableUserData()
      await clearPersistedData()
      queryClient.clear()
      handleThemeModeSwitch("system")
      handleThemeSwitch(DEFAULT_BOARD_COLOR)
      await navigate({
        to: "/board/$boardId",
        params: { boardId: ALL_BOARD_ID },
        replace: true,
      })
      onCleared()
    })
    setClearArmed(false)
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Import and export"
        description="Choose which data to include. Importing replaces only selected data found in the file. Browser permissions and device-only state are excluded."
      >
        <Card variant="subtle">
          <CardContent className="space-y-5">
            <div className="space-y-4">
              {DATA_SLICE_OPTIONS.map(option => (
                <label key={option.id} className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={selectedSliceIds.includes(option.id)}
                    onCheckedChange={checked => setSliceSelected(option.id, checked)}
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-sm leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button type="button" size="sm" disabled={!hasSelection} onClick={handleExport}>
                Export selected
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasSelection}
                onClick={() => fileInputRef.current?.click()}
              >
                Import selected
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
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        title="Clear user data"
        description="Delete all boards, source instances, settings, saved source secrets, cached source data, and granted browser permissions. This cannot be undone."
      >
        <Card variant="subtle">
          <CardContent>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={clearing}
              onBlur={() => setClearArmed(false)}
              onClick={() => void handleClear()}
            >
              {clearArmed
                ? <PhCheckCircle data-icon="inline-start" />
                : <PhTrash data-icon="inline-start" />}
              {clearing
                ? "Clearing..."
                : clearArmed ? "Confirm clear all data" : "Clear all user data"}
            </Button>
            {clearError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {clearError}
              </p>
            )}
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  )
}

function formatSliceList(sliceIds: readonly PersistedPortableSliceId[]): string {
  return sliceIds
    .map(id => DATA_SLICE_OPTIONS.find(option => option.id === id)?.label ?? id)
    .join(", ")
}
