import type { FilterState, FeedStats } from "@/lib/feed-admin"
import type { ComponentProps } from "react"
import { categories } from "@newsnext/feeds/typings"
import { Input } from "@newsnext/ui/components/input"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@newsnext/ui/components/sidebar"
import { ChartBar, Database, Filter, Search, Settings2 } from "lucide-react"
import { Field } from "./field"
import { selectClassName } from "@/lib/feed-admin"

export function AppSidebar({
  stats,
  query,
  category,
  filterState,
  onQueryChange,
  onCategoryChange,
  onFilterStateChange,
  ...props
}: ComponentProps<typeof Sidebar> & {
  stats: FeedStats
  query: string
  category: string
  filterState: FilterState
  onQueryChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onFilterStateChange: (value: FilterState) => void
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Database className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">NewsNext Admin</span>
                <span className="truncate text-xs">Feed catalog</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Search className="size-4" />
            Filters
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 px-2">
            <Field label="Search">
              <Input
                value={query}
                placeholder="Provider, title, id..."
                onChange={event => onQueryChange(event.target.value)}
              />
            </Field>
            <Field label="Category">
              <select className={selectClassName} value={category} onChange={event => onCategoryChange(event.target.value)}>
                <option value="all">All categories</option>
                {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="State">
              <select className={selectClassName} value={filterState} onChange={event => onFilterStateChange(event.target.value as FilterState)}>
                <option value="all">All feeds</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Hidden</option>
              </select>
            </Field>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>
            <ChartBar className="size-4" />
            Snapshot
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SnapshotItem label="Total feeds" value={stats.total} />
              <SnapshotItem label="Enabled" value={stats.enabled} />
              <SnapshotItem label="Providers" value={stats.providers} />
              <SnapshotItem label="Categories" value={stats.categories} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Settings2 className="size-4" />
              <span>Database backed</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function SnapshotItem({ label, value }: { label: string, value: number }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton>
        <Filter className="size-4" />
        <span>{label}</span>
        <span className="ml-auto text-xs font-medium text-sidebar-foreground/70">{value}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
