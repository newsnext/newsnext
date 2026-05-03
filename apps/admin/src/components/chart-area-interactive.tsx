import type { AdminSourceRow } from "@/lib/source-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@newsnext/ui/components/card"
import { formatCategory } from "@/lib/source-admin"

export function ChartAreaInteractive({ sources }: { sources: AdminSourceRow[] }) {
  const rows = getCategoryRows(sources)
  const max = Math.max(1, ...rows.map(row => row.total))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Coverage</CardTitle>
        <CardDescription>Enabled and hidden source distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {rows.map(row => (
            <div key={row.category} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{formatCategory(row.category)}</span>
                <span className="shrink-0 text-muted-foreground">
                  {row.enabled}
                  /
                  {row.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (row.enabled / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function getCategoryRows(sources: AdminSourceRow[]) {
  const map = new Map<string, { category: string, total: number, enabled: number }>()

  for (const source of sources) {
    const row = map.get(source.category) ?? { category: source.category, total: 0, enabled: 0 }
    row.total += 1
    if (source.enabled) {
      row.enabled += 1
    }
    map.set(source.category, row)
  }

  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}
