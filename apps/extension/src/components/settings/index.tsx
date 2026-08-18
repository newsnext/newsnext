import type { LiveCardHeight, SettingsTabId } from "@/lib/settings"
import { Label } from "@newsnext/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { TabsContent } from "@newsnext/ui/components/tabs"
import { useAtom, useAtomValue } from "jotai"
import { useEffect } from "react"
import { ConfigSection } from "@/components/common/config-section"
import { cn } from "@/lib/utils"
import { handleThemeModeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom } from "@/store/board"
import {
  defaultBoardIdAtom,
  liveCardHeightAtom,
  settingsTabAtom,
  themeModeAtom,
} from "@/store/settings"
import { ThemeModeSelector } from "../theme-mode-selector"
import { BgIllustrationSettings } from "./bg-illustration"
import { DataTransferSettings } from "./data-transfer"
import { SettingsModalShell } from "./modal-shell"
import { PermissionsSettings } from "./permissions"
import { ShortcutsSettings } from "./shortcuts"
import { SourceConnectionSettings } from "./source-connection"
import { SourceIconSettings } from "./source-icon"

const LAST_USED_BOARD_VALUE = "__last_used__"

interface LiveCardHeightOption {
  label: string
  previewClassName: string
  value: LiveCardHeight
}

const LIVE_CARD_HEIGHT_OPTIONS: LiveCardHeightOption[] = [
  {
    label: "Compact",
    previewClassName: "h-12",
    value: "compact",
  },
  {
    label: "Balanced",
    previewClassName: "h-12.5",
    value: "balanced",
  },
  {
    label: "Tall",
    previewClassName: "h-14.5",
    value: "tall",
  },
]

export type { SettingsTabId } from "@/lib/settings"

export function SettingsModal({
  initialTab,
  open,
  onOpenChange,
}: {
  initialTab?: SettingsTabId
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const resetKey = `${open}:${initialTab ?? "saved"}`
  return (
    <SettingsModalContent
      key={resetKey}
      initialTab={initialTab}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

function SettingsModalContent({
  initialTab,
  open,
  onOpenChange,
}: {
  initialTab?: SettingsTabId
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = useAtom(settingsTabAtom)

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab, setActiveTab])

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId)
  }

  return (
    <SettingsModalShell
      activeTab={activeTab}
      open={open}
      onOpenChange={onOpenChange}
      onTabChange={handleTabChange}
    >
      <TabsContent value="appearance"><AppearanceSettings /></TabsContent>
      <TabsContent value="general"><GeneralSettings /></TabsContent>
      <TabsContent value="cli"><SourceConnectionSettings /></TabsContent>
      <TabsContent value="shortcuts"><ShortcutsSettings /></TabsContent>
      <TabsContent value="permissions"><PermissionsSettings /></TabsContent>
      <TabsContent value="data">
        <DataTransferSettings onCleared={() => onOpenChange(false)} />
      </TabsContent>
    </SettingsModalShell>
  )
}

function AppearanceSettings() {
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)
  useEffect(() => {
    handleThemeModeSwitch(themeMode)
  }, [themeMode])

  return (
    <div className="space-y-6">
      <ConfigSection
        title="Theme mode"
      >
        <ThemeModeSelector
          value={themeMode}
          onValueChange={setThemeMode}
        />
      </ConfigSection>
      <LiveCardHeightSettings />
      <BgIllustrationSettings />
    </div>
  )
}

function LiveCardHeightSettings() {
  const [liveCardHeight, setLiveCardHeight] = useAtom(liveCardHeightAtom)

  return (
    <ConfigSection
      title="LiveCard height"
      description="Choose how tall LiveCards appear on the board."
    >
      <RadioGroup
        className="grid w-full grid-cols-3 gap-2"
        value={liveCardHeight}
        onValueChange={setLiveCardHeight}
      >
        {LIVE_CARD_HEIGHT_OPTIONS.map((option) => {
          const isSelected = option.value === liveCardHeight
          return (
            <Label key={option.value} className="cursor-pointer">
              <RadioGroupItem
                aria-label={option.label}
                value={option.value}
                className="peer sr-only"
              />
              <span className={cn(
                "flex min-h-28 flex-1 flex-col items-center justify-center gap-2 rounded-2xl px-2 py-2 text-center text-muted-foreground transition-colors outline-none hover:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-theme-400",
                isSelected && "text-foreground",
              )}
              >
                <span className="flex h-16 items-center justify-center" aria-hidden>
                  <span className={cn(
                    "flex w-10 flex-col rounded-xl border bg-background/35 p-1.5 transition-all",
                    option.previewClassName,
                    isSelected
                      ? "border-primary text-primary ring-2 ring-primary/15"
                      : "border-foreground/20",
                  )}
                  >
                    <span className="h-1 w-3/5 rounded-full bg-current/55" />
                    <span className="mt-1 min-h-0 flex-1 rounded-sm bg-current/15" />
                  </span>
                </span>
                <span className={cn("font-semibold leading-tight", isSelected && "text-primary")}>
                  {option.label}
                </span>
              </span>
            </Label>
          )
        })}
      </RadioGroup>
    </ConfigSection>
  )
}

function GeneralSettings() {
  const boards = useAtomValue(boardsAtom)
  const [defaultBoardId, setDefaultBoardId] = useAtom(defaultBoardIdAtom)
  const selectedValue = defaultBoardId ?? LAST_USED_BOARD_VALUE

  return (
    <div className="space-y-6">
      <ConfigSection
        title="Default board"
        description="Choose which board opens when NewsNext starts."
        surfaceClassName="overflow-x-auto scrollbar-hidden"
      >
        <RadioGroup
          aria-label="Default board"
          variant="segmented"
          value={selectedValue}
          onValueChange={(value: string) => {
            setDefaultBoardId(value === LAST_USED_BOARD_VALUE ? null : value)
          }}
        >
          {boards.map(board => (
            <RadioGroupItem key={board.id} value={board.id}>{board.name}</RadioGroupItem>
          ))}
          <RadioGroupItem value={LAST_USED_BOARD_VALUE}>Last used</RadioGroupItem>
        </RadioGroup>
      </ConfigSection>
      <SourceIconSettings />
    </div>
  )
}
