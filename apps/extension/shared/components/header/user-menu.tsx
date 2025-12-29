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
import { useState } from "react"
import { PhGearDuotone, PhUserDuotone } from "../icons/ph"
import { SettingsModal } from "../settings"

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
