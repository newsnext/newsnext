import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import { Label } from "@newsnext/ui/components/label"
import { cn } from "@newsnext/ui/lib/utils"
import { useEffect, useState } from "react"
import { SegmentedControl } from "../common/segmented-control"
import { ThemeSelector } from "../common/theme-selector"
import { PhGearDuotone, PhUserDuotone } from "../icons/ph"

export function UserMenu() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="island-pill size-10 bg-linear-to-br from-theme-400 to-theme-600 hover:from-theme-500 hover:to-theme-700 flex items-center justify-center text-white font-semibold text-base pointer-events-auto cursor-pointer outline-none" title="User Profile">
          U
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
            <PhGearDuotone className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsAccountOpen(true)}>
            <PhUserDuotone className="size-4" />
            Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <AccountModal open={isAccountOpen} onOpenChange={setIsAccountOpen} />
    </>
  )
}

const SETTINGS_TAB_KEY = "newsnext-settings-tab"
const DEFAULT_BOARD_KEY = "newsnext-default-board"

function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
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
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Theme Color</h3>
        <div className="flex w-[300px] h-[160px]">
          <ThemeSelector onClose={() => {}} />
        </div>
      </div>
    </div>
  )
}

function GeneralSettings() {
  const [defaultBoard, setDefaultBoard] = useState("hottest")

  const TABS = [
    { label: "Hottest", value: "hottest" },
    { label: "Timeline", value: "timeline" },
    { label: "Realtime", value: "realtime" },
  ] as const

  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_BOARD_KEY)
    if (saved) setDefaultBoard(saved)
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

function AccountModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          Account Details Here
        </div>
      </DialogContent>
    </Dialog>
  )
}
