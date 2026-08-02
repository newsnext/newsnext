import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { Tabs, TabsList, TabsTrigger } from "@newsnext/ui/components/tabs"

export type SettingsTabId = "appearance" | "general" | "permissions"

interface SettingsModalShellProps {
  activeTab: SettingsTabId
  children?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onTabChange: (tabId: SettingsTabId) => void
}

const SETTINGS_TABS: Array<{ id: SettingsTabId, label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "general", label: "General" },
  { id: "permissions", label: "Permissions" },
]

export function SettingsModalShell({
  activeTab,
  children,
  open,
  onOpenChange,
  onTabChange,
}: SettingsModalShellProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="themed"
        className="h-[min(37.5rem,calc(100vh-2rem))] w-full max-w-3xl sm:max-w-3xl"
        surfaceClassName="grid grid-rows-[auto_minmax(0,1fr)] gap-0"
      >
        <DialogHeader className="h-10 flex-row items-center gap-2 px-3 pr-12">
          <DialogTitle className="font-bold">Settings</DialogTitle>
          <span aria-hidden className="text-foreground/25">/</span>
          <h2 className="text-sm leading-none font-medium text-foreground/60">
            {SETTINGS_TABS.find(tab => tab.id === activeTab)?.label}
          </h2>
        </DialogHeader>

        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={(value) => {
            const tab = SETTINGS_TABS.find(item => item.id === value)
            if (tab) {
              onTabChange(tab.id)
            }
          }}
          className="flex min-h-0 gap-0"
        >
          <TabsList variant="sidebar">
            {SETTINGS_TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          <div className="relative min-w-0 flex-1">
            <SquircleBox
              aria-hidden
              radius="2xl"
              variant="modal-inner"
              className="pointer-events-none absolute inset-0"
            />
            {children && (
              <div className="relative size-full overflow-y-auto p-4 sm:p-6">
                {children}
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
