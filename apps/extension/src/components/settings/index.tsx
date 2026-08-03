import type { SettingsTabId } from "./modal-shell"
import type { AppBackground, ThemeMode } from "@/lib/utils/swith-theme"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { TabsContent } from "@newsnext/ui/components/tabs"
import { useAtom, useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { getBoardDisplayName } from "@/lib/boards"
import { cn } from "@/lib/utils"
import {
  handleAppBackgroundSwitch,
  handleThemeModeSwitch,
  readAppBackground,
  THEME_MODE_KEY,
} from "@/lib/utils/swith-theme"
import { boardsAtom, defaultBoardIdAtom } from "@/store/board"
import { SettingsSection } from "./layout"
import { SettingsModalShell } from "./modal-shell"
import { PermissionsSettings } from "./permissions"
import { SourceConnectionSettings } from "./source-connection"
import { SourceIconSettings } from "./source-icon"

const SETTINGS_TAB_KEY = "newsnext-settings-tab"
const LAST_USED_BOARD_VALUE = "__last_used__"

const BACKGROUND_OPTIONS: Array<{
  className: string
  label: string
  value: AppBackground
}> = [
  { value: "ambient", label: "Ambient", className: "ambient-theme-400" },
  { value: "sunrise", label: "Sunrise", className: "sunrise-theme-400" },
  { value: "horizon", label: "Horizon", className: "horizon-theme-400" },
  { value: "orbit", label: "Orbit", className: "orbit-theme-400" },
  { value: "halo", label: "Halo", className: "halo-theme-400" },
  { value: "ribbon", label: "Ribbon", className: "ribbon-theme-400" },
  { value: "nebula", label: "Nebula", className: "nebula-theme-400" },
  { value: "tide", label: "Tide", className: "tide-theme-400" },
]

export type { SettingsTabId } from "./modal-shell"

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
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    return readSettingsTab(initialTab)
  })

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId)
    localStorage.setItem(SETTINGS_TAB_KEY, tabId)
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
      <TabsContent value="permissions"><PermissionsSettings /></TabsContent>
    </SettingsModalShell>
  )
}

function readSettingsTab(initialTab?: SettingsTabId): SettingsTabId {
  if (initialTab) {
    localStorage.setItem(SETTINGS_TAB_KEY, initialTab)
    return initialTab
  }

  const savedTab = localStorage.getItem(SETTINGS_TAB_KEY)
  return isSettingsTabId(savedTab) ? savedTab : "appearance"
}

function isSettingsTabId(value: string | null): value is SettingsTabId {
  return value === "appearance"
    || value === "general"
    || value === "permissions"
}

function AppearanceSettings() {
  const [appBackground, setAppBackground] = useState<AppBackground>(readAppBackground)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null
    return stored ?? "dark"
  })
  useEffect(() => {
    handleThemeModeSwitch(themeMode)
  }, [themeMode])
  useEffect(() => {
    handleAppBackgroundSwitch(appBackground)
  }, [appBackground])

  return (
    <div className="space-y-8">
      <SettingsSection
        title="App background"
        description="Choose how the board theme color blends into the workspace."
      >
        <RadioGroup
          aria-label="App background"
          variant="preview"
          value={appBackground}
          onValueChange={setAppBackground}
        >
          {BACKGROUND_OPTIONS.map(option => (
            <RadioGroupItem
              key={option.value}
              value={option.value}
            >
              <span
                aria-hidden
                className={cn(
                  "block h-14 w-full rounded-xl bg-background ring-1 ring-foreground/6",
                  option.className,
                )}
              />
              <span className="mt-2 flex items-center justify-between gap-2 px-1 text-xs font-medium">
                {option.label}
                <span className="size-1.5 rounded-full bg-theme-500 opacity-0 transition-opacity group-data-checked/radio-preview:opacity-100" />
              </span>
            </RadioGroupItem>
          ))}
        </RadioGroup>
      </SettingsSection>

      <SettingsSection
        title="Theme mode"
        description="Choose a light or dark interface, or follow your system setting."
      >
        <Card variant="subtle">
          <CardContent>
            <RadioGroup
              variant="segmented"
              value={themeMode}
              onValueChange={setThemeMode}
            >
              <RadioGroupItem value="dark">Dark</RadioGroupItem>
              <RadioGroupItem value="light">Light</RadioGroupItem>
              <RadioGroupItem value="system">System</RadioGroupItem>
            </RadioGroup>
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  )
}

function GeneralSettings() {
  const boards = useAtomValue(boardsAtom)
  const [defaultBoardId, setDefaultBoardId] = useAtom(defaultBoardIdAtom)
  const selectedValue = defaultBoardId ?? LAST_USED_BOARD_VALUE
  const selectedLabel = defaultBoardId === null
    ? "Last used"
    : getBoardDisplayName(boards.find(board => board.id === defaultBoardId)!)

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Default board"
        description="Choose which board opens when NewsNext starts."
      >
        <Card variant="subtle">
          <CardContent>
            <Select
              value={selectedValue}
              onValueChange={(value) => {
                if (value) {
                  setDefaultBoardId(value === LAST_USED_BOARD_VALUE ? null : value)
                }
              }}
            >
              <SelectTrigger className="w-56 max-w-full">
                <span className="flex-1 truncate text-left">{selectedLabel}</span>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={LAST_USED_BOARD_VALUE}>Last used</SelectItem>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>{getBoardDisplayName(board)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </SettingsSection>
      <SourceIconSettings />
      <SourceConnectionSettings />
    </div>
  )
}
