import { Badge } from "@newsnext/ui/components/badge"

export function SourceStateBadge({ enabled }: { enabled: boolean }) {
  return enabled
    ? <Badge variant="secondary">Enabled</Badge>
    : <Badge variant="outline">Hidden</Badge>
}
