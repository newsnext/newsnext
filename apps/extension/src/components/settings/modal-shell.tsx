import type { ReactNode } from "react"
import type { SettingsTabId } from "@/lib/settings"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { Tabs, TabsList, TabsTrigger } from "@newsnext/ui/components/tabs"
import { useEffect, useRef } from "react"

export type { SettingsTabId } from "@/lib/settings"

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
  { id: "cli", label: "CLI connection" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "permissions", label: "Permissions" },
  { id: "data", label: "Data" },
]

export function SettingsModalShell({
  activeTab,
  children,
  open,
  onOpenChange,
  onTabChange,
}: SettingsModalShellProps): React.JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [activeTab])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="themed"
        className="h-[min(37.5rem,calc(100vh-2rem))] w-full max-w-3xl sm:max-w-3xl"
        surfaceClassName="grid min-h-0"
      >
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
          <div className="w-32 shrink-0 sm:w-44">
            <DialogHeader className="h-10 flex-row items-center px-3">
              <DialogTitle className="font-bold">Settings</DialogTitle>
            </DialogHeader>
            <TabsList variant="sidebar" className="w-full sm:w-full">
              {SETTINGS_TABS.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="relative min-w-0 flex-1">
            <SquircleBox
              aria-hidden
              radius="2xl"
              variant="modal-inner"
              className="pointer-events-none absolute inset-0"
            />
            {children && (
              <div ref={contentRef} className="relative size-full overflow-y-auto p-4 sm:p-6">
                {children}
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
