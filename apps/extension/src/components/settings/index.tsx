import type { ThemeMode } from "@/lib/utils/swith-theme"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { MODAL_INNER_SURFACE_CLASS, MODAL_SHELL_CLASS } from "@newsnext/ui/lib/modal"
import { cn } from "@newsnext/ui/lib/utils"
import { useAtom, useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { getBoardDisplayName } from "@/lib/boards"
import {
  handleThemeModeSwitch,
  THEME_MODE_KEY,
} from "@/lib/utils/swith-theme"
import { boardsAtom, defaultBoardIdAtom } from "@/store/board"
import { SegmentedControl } from "../common/segmented-control"
import { SettingsPanel, SettingsSection } from "./layout"
import { PermissionsSettings } from "./permissions"
import { SourceConnectionSettings } from "./source-connection"
import { SourceIconSettings } from "./source-icon"

const SETTINGS_TAB_KEY = "newsnext-settings-tab"
const LAST_USED_BOARD_VALUE = "__last_used__"
export type SettingsTabId = "appearance" | "general" | "permissions"

const SETTINGS_TABS: Array<{ id: SettingsTabId, label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "general", label: "General" },
  { id: "permissions", label: "Permissions" },
]

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(37.5rem,calc(100vh-2rem))] w-full max-w-3xl sm:max-w-3xl"
        surfaceClassName={cn("grid grid-rows-[auto_minmax(0,1fr)] gap-0", MODAL_SHELL_CLASS)}
      >
        <DialogHeader className="h-10 flex-row items-center gap-2 px-3 pr-12">
          <DialogTitle className="font-bold">Settings</DialogTitle>
          <span aria-hidden className="text-foreground/25">/</span>
          <h2 className="text-sm leading-none font-medium text-foreground/60">
            {SETTINGS_TABS.find(t => t.id === activeTab)?.label}
          </h2>
        </DialogHeader>

        <div className="flex min-h-0">
          <div className="flex w-32 shrink-0 flex-col gap-1 p-1 pr-2 sm:w-44 sm:p-2 sm:pr-4">
            {SETTINGS_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex w-full items-center rounded-full px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-theme-400",
                  activeTab === tab.id
                    ? "bg-background/75 text-foreground shadow-sm ring-1 ring-foreground/5"
                    : "text-foreground/60 hover:bg-background/25 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <SquircleBox
              aria-hidden
              radius="2xl"
              className={cn("pointer-events-none absolute inset-0 ring-1 ring-foreground/5", MODAL_INNER_SURFACE_CLASS)}
            />
            <div className="relative size-full overflow-y-auto p-4 sm:p-6">
              {activeTab === "appearance" && <AppearanceSettings />}
              {activeTab === "general" && <GeneralSettings />}
              {activeTab === "permissions" && <PermissionsSettings />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null
    return stored ?? "dark"
  })
  useEffect(() => {
    handleThemeModeSwitch(themeMode)
  }, [themeMode])

  return (
    <SettingsSection
      title="Theme mode"
      description="Choose a light or dark interface, or follow your system setting."
    >
      <SettingsPanel>
        <SegmentedControl<ThemeMode>
          items={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "system", label: "System" },
          ]}
          value={themeMode}
          onValueChange={setThemeMode}
          layoutId="theme-mode-toggle"
        />
      </SettingsPanel>
    </SettingsSection>
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
        <SettingsPanel>
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
        </SettingsPanel>
      </SettingsSection>
      <SourceIconSettings />
      <SourceConnectionSettings />
    </div>
  )
}
