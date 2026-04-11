import type { ThemeMode, ThemeVersion } from "@/lib/utils/swith-theme"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { Label } from "@newsnext/ui/components/label"
import { cn } from "@newsnext/ui/lib/utils"
import { useEffect, useState } from "react"
import {
  handleThemeModeSwitch,
  handleThemeVersionSwitch,
  THEME_MODE_KEY,
  THEME_VERSION_KEY,
} from "@/lib/utils/swith-theme"
import { SegmentedControl } from "../common/segmented-control"
import { ThemeSelector } from "../common/theme-selector"

const SETTINGS_TAB_KEY = "newsnext-settings-tab"
const DEFAULT_BOARD_KEY = "newsnext-default-board"

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(SETTINGS_TAB_KEY) || "appearance"
  })

  useEffect(() => {
    if (open) {
      const savedTab = localStorage.getItem(SETTINGS_TAB_KEY)
      if (savedTab) setActiveTab(savedTab)
    }
  }, [open])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    localStorage.setItem(SETTINGS_TAB_KEY, tabId)
  }

  const tabs = [
    { id: "appearance", label: "Appearance" },
    { id: "general", label: "General" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full h-[600px] p-0 gap-0 overflow-hidden flex sm:max-w-3xl">
        {/* Left Sidebar */}
        <div className="w-48 border-r bg-muted/30 p-2 flex flex-col gap-1 shrink-0">
          <div className="p-4 font-semibold text-sm text-muted-foreground">Settings</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
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
            <DialogTitle>{tabs.find(t => t.id === activeTab)?.label}</DialogTitle>
          </DialogHeader>
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "general" && <GeneralSettings />}
        </div>
      </DialogContent>
    </Dialog>
  )
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
  const [defaultBoard, setDefaultBoard] = useState("recommend")

  const TABS = [
    { label: "Recommend", value: "recommend" },
    { label: "Stars", value: "stars" },
    { label: "Last Used", value: "last" },
  ] as const

  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_BOARD_KEY)
    if (saved) {
      setDefaultBoard(saved)
    }
  }, [])

  const handleDefaultBoardChange = (value: string) => {
    setDefaultBoard(value)
    localStorage.setItem(DEFAULT_BOARD_KEY, value)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Default Tab</Label>
        <SegmentedControl
          items={TABS}
          value={defaultBoard}
          onValueChange={handleDefaultBoardChange}
          layoutId="default-board-tab"
        />
        <p className="text-sm text-muted-foreground">
          Choose which tab to show when the extension opens.
        </p>
      </div>
    </div>
  )
}
