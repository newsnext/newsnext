import { Badge } from "@newsnext/ui/components/badge"

export function FeedStateBadge({ enabled }: { enabled: boolean }) {
  return enabled
    ? <Badge variant="secondary">Enabled</Badge>
    : <Badge variant="outline">Hidden</Badge>
}
