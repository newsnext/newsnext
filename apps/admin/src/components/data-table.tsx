import type { AdminFeedRow } from "@/lib/feed-admin"
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
import { FeedStateBadge } from "./feed-state-badge"
import { formatCategory } from "@/lib/feed-admin"

export function DataTable({
  feeds,
  selectedKey,
  onSelect,
}: {
  feeds: AdminFeedRow[]
  selectedKey: string
  onSelect: (key: string) => void
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b pb-4">
        <CardTitle>Feeds</CardTitle>
        <CardDescription>{feeds.length} matching feeds</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[34rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Feed</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeds.map(feed => (
                <TableRow
                  key={feed.key}
                  data-state={selectedKey === feed.key ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => onSelect(feed.key)}
                >
                  <TableCell className="min-w-64">
                    <div className="font-medium">{feed.title || feed.name}</div>
                    <div className="text-xs text-muted-foreground">{feed.key}</div>
                  </TableCell>
                  <TableCell>{feed.provider}</TableCell>
                  <TableCell>{formatCategory(feed.category)}</TableCell>
                  <TableCell>
                    <FeedStateBadge enabled={feed.enabled} />
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
