import type { SettingsTabId } from "@/lib/persisted-settings"
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
import { useEffect } from "react"
import { handleThemeModeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom } from "@/store/board"
import {
  defaultBoardIdAtom,
  settingsTabAtom,
  themeModeAtom,
} from "@/store/settings"
import { BackgroundArtworkSettings } from "./background-artwork"
import { DataTransferSettings } from "./data-transfer"
import { SettingsSection } from "./layout"
import { SettingsModalShell } from "./modal-shell"
import { PermissionsSettings } from "./permissions"
import { SourceConnectionSettings } from "./source-connection"
import { SourceIconSettings } from "./source-icon"

const LAST_USED_BOARD_VALUE = "__last_used__"

export type { SettingsTabId } from "@/lib/persisted-settings"

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
    <div className="space-y-8">
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
      <BackgroundArtworkSettings />
    </div>
  )
}

function GeneralSettings() {
  const boards = useAtomValue(boardsAtom)
  const [defaultBoardId, setDefaultBoardId] = useAtom(defaultBoardIdAtom)
  const selectedValue = defaultBoardId ?? LAST_USED_BOARD_VALUE
  const selectedLabel = defaultBoardId === null
    ? "Last used"
    : boards.find(board => board.id === defaultBoardId)!.name

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
                  <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
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
