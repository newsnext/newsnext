import type { Hotkey } from "@tanstack/react-hotkeys"
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
import {
  DEFAULT_SHORTCUT_SETTINGS,
  SHORTCUT_DEFINITIONS,
  SHORTCUT_ORDER,
} from "@/lib/settings"
import { cn } from "@/lib/utils"
import { shortcutSettingsAtom } from "@/store/settings"

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
        setStatus(`${formatForDisplay(hotkey)} is already assigned to ${SHORTCUT_DEFINITIONS[conflict].label}.`)
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
      title="Keyboard shortcuts"
      description="Select a shortcut to record a new key combination. Press Escape to cancel, or Backspace or Delete to clear it."
      surface={false}
    >
      <Card variant="subtle">
        <CardContent className="@container divide-y divide-border/50 p-0">
          {SHORTCUT_ORDER.map((shortcutId) => {
            const definition = SHORTCUT_DEFINITIONS[shortcutId]
            return (
              <ShortcutRow
                key={shortcutId}
                description={definition.description}
                hotkey={shortcuts[shortcutId]}
                isDefault={shortcuts[shortcutId] === DEFAULT_SHORTCUT_SETTINGS[shortcutId]}
                isRecording={editingShortcut === shortcutId && recorder.isRecording}
                label={definition.label}
                onRecord={() => startRecording(shortcutId)}
                onReset={() => resetShortcut(shortcutId)}
              />
            )
          })}
        </CardContent>
      </Card>
      <p role="status" className={status ? "px-0.5 text-xs text-destructive" : "sr-only"}>
        {status || (recorder.isRecording ? "Recording shortcut" : "")}
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
  const displayHotkey = formatShortcut(hotkey)

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
            ? `Recording ${label} shortcut`
            : `Change ${label} shortcut, currently ${displayHotkey}`}
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
          aria-label={`Reset ${label} shortcut`}
          title={`Reset ${label} shortcut`}
          onClick={onReset}
        >
          <PhArrowCounterClockwise />
        </Button>
      </div>
    </div>
  )
}

function formatShortcut(hotkey: Hotkey | null): string {
  return hotkey ? formatForDisplay(hotkey) : "Not set"
}
