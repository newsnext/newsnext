import type { Hotkey } from "@tanstack/react-hotkeys"
import type { StaticMessageKey } from "@/lib/i18n"
import type { ShortcutId } from "@/lib/settings"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent } from "@newsnext/ui/components/card"
import {
  formatForDisplay,
  useHotkeyRecorder,
} from "@tanstack/react-hotkeys"
import { useAtom } from "jotai"
import { useState } from "react"
import { ConfigSection } from "@/components/common/config-section"
import { PhArrowCounterClockwise } from "@/components/icons/ph"
import { useI18n } from "@/hooks/use-i18n"
import {
  DEFAULT_SHORTCUT_SETTINGS,
  SHORTCUT_ORDER,
} from "@/lib/settings"
import { cn } from "@/lib/utils"
import { shortcutSettingsAtom } from "@/store/settings"

const SHORTCUT_MESSAGES: Record<ShortcutId, { descriptionKey: StaticMessageKey, labelKey: StaticMessageKey }> = {
  nextBoard: { descriptionKey: "nextBoardDescription", labelKey: "nextBoard" },
  previousBoard: { descriptionKey: "previousBoardDescription", labelKey: "previousBoard" },
  search: { descriptionKey: "searchShortcutDescription", labelKey: "search" },
  toggleNextLayer: { descriptionKey: "toggleNextLayerDescription", labelKey: "toggleNextLayer" },
}

interface ShortcutRowProps {
  description: string
  hotkey: Hotkey | null
  isDefault: boolean
  isRecording: boolean
  label: string
  onRecord: () => void
  onReset: () => void
}

export function ShortcutsSettings(): React.JSX.Element {
  const { t } = useI18n()
  const [shortcuts, setShortcuts] = useAtom(shortcutSettingsAtom)
  const [editingShortcut, setEditingShortcut] = useState<ShortcutId | null>(null)
  const [status, setStatus] = useState("")
  const recorder = useHotkeyRecorder({
    onRecord: (hotkey) => {
      if (!editingShortcut) return
      const conflict = hotkey
        ? SHORTCUT_ORDER.find(shortcutId => (
            shortcutId !== editingShortcut && shortcuts[shortcutId] === hotkey
          ))
        : undefined
      if (conflict) {
        setStatus(t("shortcutConflict", {
          hotkey: formatForDisplay(hotkey),
          label: t(SHORTCUT_MESSAGES[conflict].labelKey),
        }))
        setEditingShortcut(null)
        return
      }
      setShortcuts(current => ({
        ...current,
        [editingShortcut]: hotkey || null,
      }))
      setStatus("")
      setEditingShortcut(null)
    },
    onCancel: () => {
      setEditingShortcut(null)
      setStatus("")
    },
  })

  function startRecording(shortcutId: ShortcutId): void {
    if (recorder.isRecording) {
      recorder.cancelRecording()
      if (editingShortcut === shortcutId) return
    }
    setStatus("")
    setEditingShortcut(shortcutId)
    recorder.startRecording()
  }

  function resetShortcut(shortcutId: ShortcutId): void {
    setShortcuts(current => ({
      ...current,
      [shortcutId]: DEFAULT_SHORTCUT_SETTINGS[shortcutId],
    }))
  }

  return (
    <ConfigSection
      title={t("keyboardShortcuts")}
      description={t("keyboardShortcutsDescription")}
      surface={false}
    >
      <Card variant="subtle">
        <CardContent className="@container divide-y divide-border/50 p-0">
          {SHORTCUT_ORDER.map((shortcutId) => {
            const messages = SHORTCUT_MESSAGES[shortcutId]
            return (
              <ShortcutRow
                key={shortcutId}
                description={t(messages.descriptionKey)}
                hotkey={shortcuts[shortcutId]}
                isDefault={shortcuts[shortcutId] === DEFAULT_SHORTCUT_SETTINGS[shortcutId]}
                isRecording={editingShortcut === shortcutId && recorder.isRecording}
                label={t(messages.labelKey)}
                onRecord={() => startRecording(shortcutId)}
                onReset={() => resetShortcut(shortcutId)}
              />
            )
          })}
        </CardContent>
      </Card>
      <p role="status" className={status ? "px-0.5 text-xs text-destructive" : "sr-only"}>
        {status || (recorder.isRecording ? t("recordingShortcut") : "")}
      </p>
    </ConfigSection>
  )
}

function ShortcutRow({
  description,
  hotkey,
  isDefault,
  isRecording,
  label,
  onRecord,
  onReset,
}: ShortcutRowProps): React.JSX.Element {
  const { t } = useI18n()
  const displayHotkey = hotkey ? formatForDisplay(hotkey) : t("notSet")

  return (
    <div className="grid gap-3 p-3 @min-[26rem]:grid-cols-[minmax(0,1fr)_auto] @min-[26rem]:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 @min-[26rem]:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className={cn(
            "island-pill w-28 max-w-full",
            isRecording && "border-theme-400 ring-2 ring-theme-400/40",
          )}
          aria-label={isRecording
            ? t("recordShortcut", { label })
            : t("changeShortcut", { hotkey: displayHotkey, label })}
          aria-pressed={isRecording}
          onClick={onRecord}
        >
          <kbd
            className={cn(
              "w-full truncate text-center font-sans text-[11px] font-medium leading-none text-foreground/70",
              !hotkey && "text-muted-foreground",
            )}
          >
            {displayHotkey}
          </kbd>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="island-pill"
          disabled={isDefault}
          aria-label={t("resetShortcut", { label })}
          title={t("resetShortcut", { label })}
          onClick={onReset}
        >
          <PhArrowCounterClockwise />
        </Button>
      </div>
    </div>
  )
}
