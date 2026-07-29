import type { ThemeMode, ThemeVersion } from "@/lib/utils/swith-theme"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { Label } from "@newsnext/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { cn } from "@newsnext/ui/lib/utils"
import { useAtom, useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import {
  handleThemeModeSwitch,
  handleThemeVersionSwitch,
  THEME_MODE_KEY,
  THEME_VERSION_KEY,
} from "@/lib/utils/swith-theme"
import { boardsAtom, defaultBoardIdAtom } from "@/store/board"
import { SegmentedControl } from "../common/segmented-control"
import { ThemeSelector } from "../common/theme-selector"
import { PermissionsSettings } from "./permissions"
import { SourceConnectionSettings } from "./source-connection"

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
        className="max-w-3xl w-full h-150 sm:max-w-3xl"
        surfaceClassName="p-0 gap-0 flex"
      >
        {/* Left Sidebar */}
        <div className="w-48 border-r bg-muted/30 p-2 flex flex-col gap-1 shrink-0">
          <div className="p-4 font-semibold text-sm text-muted-foreground">Settings</div>
          {SETTINGS_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <DialogHeader className="mb-6">
            <DialogTitle>{SETTINGS_TABS.find(t => t.id === activeTab)?.label}</DialogTitle>
          </DialogHeader>
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "permissions" && <PermissionsSettings />}
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
  const [themeVersion, setThemeVersion] = useState<ThemeVersion>(() => {
    const stored = localStorage.getItem(THEME_VERSION_KEY) as ThemeVersion | null
    return stored === "v4" ? "v4" : "v3"
  })

  useEffect(() => {
    handleThemeModeSwitch(themeMode)
  }, [themeMode])

  useEffect(() => {
    handleThemeVersionSwitch(themeVersion)
  }, [themeVersion])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Theme Color</h3>
        <div className="flex w-[300px] h-[160px]">
          <ThemeSelector />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Theme Mode</Label>
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
        <p className="text-sm text-muted-foreground">
          Toggles the html `dark` class or follows your OS setting.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Color Version</Label>
        <SegmentedControl<ThemeVersion>
          items={[
            { value: "v3", label: "v3 (default)" },
            { value: "v4", label: "v4 (vivid)" },
          ]}
          value={themeVersion}
          onValueChange={setThemeVersion}
          layoutId="color-version-toggle"
        />
        <p className="text-sm text-muted-foreground">
          Tailwind v4 colors are more vivid and colorful.
        </p>
      </div>
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
      <div className="space-y-2">
        <Label>Default Board</Label>
        <Select
          value={selectedValue}
          onValueChange={(value) => {
            if (value) {
              setDefaultBoardId(value === LAST_USED_BOARD_VALUE ? null : value)
            }
          }}
        >
          <SelectTrigger className="w-56">
            <span className="flex-1 truncate text-left">{selectedLabel}</span>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value={LAST_USED_BOARD_VALUE}>Last used</SelectItem>
            {boards.map(board => (
              <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choose which board opens from the dashboard root.
        </p>
      </div>
      <SourceConnectionSettings />
    </div>
  )
}
