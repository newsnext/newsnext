import type { SettingsTabId } from "../settings"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import { cn } from "@newsnext/ui/lib/utils"
import { useState } from "react"
import { PhGearDuotone, PhUserDuotone } from "../icons/ph"
import { SettingsModal } from "../settings"

export function UserMenu() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    () => new URLSearchParams(window.location.search).has("settings"),
  )
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>("appearance")

  function openSettings(tab: SettingsTabId = "appearance"): void {
    setSettingsTab(tab)
    setIsSettingsOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex size-10 items-center justify-center rounded-full text-white font-semibold text-base pointer-events-auto cursor-pointer outline-none",
            "island-pill bg-linear-to-br from-theme-400 to-theme-600 hover:from-theme-500 hover:to-theme-700",
          )}
          title="Settings"
        >
          <PhUserDuotone className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openSettings()}>
              <PhGearDuotone className="size-4" />
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
