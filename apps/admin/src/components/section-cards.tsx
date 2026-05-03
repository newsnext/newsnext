import type { ReactNode } from "react"
import type { SourceStats } from "@/lib/source-admin"
import { Badge } from "@newsnext/ui/components/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@newsnext/ui/components/card"
import { Database, Eye, EyeOff, Layers } from "lucide-react"

export function SectionCards({ stats }: { stats: SourceStats }) {
  const enabledRatio = stats.total > 0 ? Math.round((stats.enabled / stats.total) * 100) : 0

  return (
    <div className="grid gap-4 px-4 lg:grid-cols-4 lg:px-6">
      <MetricCard title="Total sources" value={stats.total} description={`${stats.providers} providers`} icon={<Database className="size-4" />} />
      <MetricCard title="Enabled" value={stats.enabled} description={`${enabledRatio}% visible`} icon={<Eye className="size-4" />} />
      <MetricCard title="Hidden" value={stats.disabled} description="Excluded from boards" icon={<EyeOff className="size-4" />} />
      <MetricCard title="Categories" value={stats.categories} description="Active catalog groups" icon={<Layers className="size-4" />} />
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: number
  description: string
  icon: ReactNode
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle>
        <CardAction>
          <Badge variant="outline" className="gap-1.5">
            {icon}
            Live
          </Badge>
        </CardAction>
        <div className="text-sm text-muted-foreground">{description}</div>
      </CardHeader>
    </Card>
  )
}
