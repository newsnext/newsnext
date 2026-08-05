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
import { consumeSettingsOpenRequest } from "@/lib/settings-navigation"
import { PhGearDuotone, PhUserDuotone } from "../icons/ph"
import { SettingsModal } from "../settings"

const shouldOpenSettingsInitially = consumeSettingsOpenRequest()

export function UserMenu() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(shouldOpenSettingsInitially)
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
            "flex size-10 items-center justify-center rounded-full text-primary-foreground font-semibold text-base pointer-events-auto outline-none",
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
