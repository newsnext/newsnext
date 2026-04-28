import type { AdminFeedRow } from "@/lib/feed-admin"
import { Button } from "@newsnext/ui/components/button"
import { Separator } from "@newsnext/ui/components/separator"
import { SidebarTrigger } from "@newsnext/ui/components/sidebar"
import { RotateCcw, Save } from "lucide-react"

export function SiteHeader({
  userName,
  selectedFeed,
  isDirty,
  saving,
  onReset,
  onSave,
}: {
  userName: string
  selectedFeed: AdminFeedRow
  isDirty: boolean
  saving: boolean
  onReset: () => void
  onSave: () => void
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{selectedFeed.title || selectedFeed.name}</div>
        <div className="truncate text-xs text-muted-foreground">{selectedFeed.key}</div>
      </div>
      <div className="hidden text-sm text-muted-foreground md:block">{userName}</div>
      <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={!isDirty || saving}>
        <RotateCcw className="size-4" />
        Reset
      </Button>
      <Button type="button" size="sm" onClick={onSave} disabled={!isDirty || saving}>
        <Save className="size-4" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </header>
  )
}
