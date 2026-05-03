import type { AdminSourceRow } from "@/lib/source-admin"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@newsnext/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@newsnext/ui/components/table"
import { formatCategory } from "@/lib/source-admin"
import { SourceStateBadge } from "./source-state-badge"

export function DataTable({
  sources,
  selectedKey,
  onSelect,
}: {
  sources: AdminSourceRow[]
  selectedKey: string
  onSelect: (key: string) => void
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b pb-4">
        <CardTitle>Sources</CardTitle>
        <CardDescription>
          {sources.length}
          {" "}
          matching sources
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[34rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map(source => (
                <TableRow
                  key={source.key}
                  data-state={selectedKey === source.key ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => onSelect(source.key)}
                >
                  <TableCell className="min-w-64">
                    <div className="font-medium">{source.title || source.name}</div>
                    <div className="text-xs text-muted-foreground">{source.key}</div>
                  </TableCell>
                  <TableCell>{source.provider}</TableCell>
                  <TableCell>{formatCategory(source.category)}</TableCell>
                  <TableCell>
                    <SourceStateBadge enabled={source.enabled} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
