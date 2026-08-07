import type { SettingsTabId } from "../settings"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import { cn } from "@newsnext/ui/lib/utils"
import { useEffect, useState } from "react"
import { consumeSettingsOpenRequest, subscribeToSettingsOpenRequests } from "@/lib/settings-navigation"
import { PhGear, PhUser } from "../icons/ph"
import { SettingsModal } from "../settings"

const initialSettingsTab = consumeSettingsOpenRequest()

export function UserMenu() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(Boolean(initialSettingsTab))
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>(initialSettingsTab ?? "appearance")

  useEffect(() => subscribeToSettingsOpenRequests(openSettings), [])

  function openSettings(tab: SettingsTabId = "appearance"): void {
    setSettingsTab(tab)
    setIsSettingsOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex size-10 items-center justify-center rounded-full text-primary-foreground font-semibold text-base pointer-events-auto outline-none",
            "island-pill bg-linear-to-br from-theme-400 to-theme-600 hover:from-theme-500 hover:to-theme-700",
          )}
          title="Settings"
        >
          <PhUser className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openSettings()}>
              <PhGear className="size-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsModal
        initialTab={settingsTab}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  )
}
