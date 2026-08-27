import type { ReactNode } from "react"
import type { SettingsTabId } from "@/lib/settings"
import {
  ContentDialogContent,
  Dialog,
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
  { id: "cli", label: "Integration" },
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
      <ContentDialogContent
        variant="themed"
        className="w-full max-w-3xl sm:max-w-3xl"
        surfaceClassName="grid min-h-0"
      >
        <DialogTitle className="sr-only">Preferences</DialogTitle>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const tab = SETTINGS_TABS.find(item => item.id === value)
            if (tab) {
              onTabChange(tab.id)
            }
          }}
          className="min-h-0 w-full min-w-0 flex-col gap-0"
        >
          <div className="shrink-0 pb-2">
            <TabsList
              variant="line"
              className="grid h-10 w-full grid-cols-6 gap-0 p-0"
            >
              {SETTINGS_TABS.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-10 min-w-0 w-full flex-none rounded-none border-0 px-0 py-2 text-xs text-foreground/50 after:hidden hover:text-foreground/75 data-active:text-foreground data-active:font-semibold sm:px-2 sm:text-sm"
                >
                  <span className="min-w-0 truncate" title={tab.label}>
                    {tab.label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="relative min-h-0 min-w-0 flex-1">
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
      </ContentDialogContent>
    </Dialog>
  )
}
