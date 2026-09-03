import type { ReactNode } from "react"
import type { StaticMessageKey } from "@/lib/i18n"
import type { SettingsTabId } from "@/lib/settings"
import {
  ContentDialogContent,
  Dialog,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { Tabs, TabsList, TabsTrigger } from "@newsnext/ui/components/tabs"
import { useEffect, useRef } from "react"
import { useI18n } from "@/hooks/use-i18n"

export type { SettingsTabId } from "@/lib/settings"

interface SettingsModalShellProps {
  activeTab: SettingsTabId
  children?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onTabChange: (tabId: SettingsTabId) => void
}

const SETTINGS_TABS: Array<{ id: SettingsTabId, labelKey: StaticMessageKey }> = [
  { id: "appearance", labelKey: "appearance" },
  { id: "general", labelKey: "general" },
  { id: "registry", labelKey: "registry" },
  { id: "cli", labelKey: "integration" },
  { id: "shortcuts", labelKey: "shortcuts" },
  { id: "permissions", labelKey: "permissions" },
  { id: "data", labelKey: "data" },
]

export function SettingsModalShell({
  activeTab,
  children,
  open,
  onOpenChange,
  onTabChange,
}: SettingsModalShellProps): React.JSX.Element {
  const { t } = useI18n()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [activeTab])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ContentDialogContent surfaceClassName="min-h-0 py-0">
        <DialogTitle className="sr-only">{t("preferences")}</DialogTitle>
        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={(value) => {
            const tab = SETTINGS_TABS.find(item => item.id === value)
            if (tab) {
              onTabChange(tab.id)
            }
          }}
          className="min-h-0 w-full min-w-0"
        >
          <div className="min-h-0 w-24 shrink-0 overflow-y-auto py-4.5 sm:w-32">
            <TabsList
              aria-label={t("preferences")}
              variant="sidebar"
            >
              {SETTINGS_TABS.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="min-w-0 text-xs sm:text-sm"
                >
                  <span className="min-w-0 truncate" title={t(tab.labelKey)}>
                    {t(tab.labelKey)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div ref={contentRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto border-l border-border/60 px-4 py-6.5 sm:px-6 sm:py-8.5">
            {children}
          </div>
        </Tabs>
      </ContentDialogContent>
    </Dialog>
  )
}
