import type { Color } from "@newsnext/sdk/models"
import type { WidgetUi } from "./widget-manifest"
import { useMemo, useState } from "react"
import { LiveCardItems } from "@/components/live-card/card-items"
import { SourceErrorState } from "@/components/live-card/card-source-state"
import { LiveCardIdentityContext } from "@/components/live-card/live-card-identity-context"
import { useSourceMarkScales } from "@/hooks/use-source-mark-scales"
import { parseWidgetItems } from "./widget-items"

interface BuiltinLiveCardProps {
  ui: Extract<WidgetUi, { type: "live-card" }>
  title: string
  color: Color
  queries: Record<string, unknown>
  isFetching: boolean
  onRefresh: () => void
  statusMessage?: string
}

export function BuiltinLiveCard({ ui, title, color, queries, statusMessage, isFetching, onRefresh }: BuiltinLiveCardProps): React.JSX.Element {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const result = useMemo(() => {
    try {
      return { items: parseWidgetItems(queries[ui.query]), error: undefined }
    } catch (error) {
      return { items: [], error: error instanceof Error ? error.message : "Invalid Widget data" }
    }
  }, [queries, ui.query])
  const identity = useMemo(() => ({ name: title, color }), [title, color])
  const groups = useMemo(() => [{ items: result.items, sourceKey: ui.query }], [result.items, ui.query])
  const markScale = useSourceMarkScales(groups).get(ui.query)
  const message = isFetching ? undefined : statusMessage ?? result.error

  return (
    <div ref={setScrollElement} className="relative size-full overflow-y-auto px-2 py-2 scrollbar-hidden" onPointerDown={event => event.stopPropagation()}>
      {message && <p role="status" className="p-2 text-sm text-muted-foreground">{message}</p>}
      {!isFetching && !message && result.items.length === 0 && <p role="status" className="p-2 text-sm text-muted-foreground">No matching items.</p>}
      <LiveCardIdentityContext value={identity}>
        {message && result.items.length === 0 && <SourceErrorState onRefresh={onRefresh} />}
        <LiveCardItems items={result.items} presentationType={ui.presentation} scrollElement={scrollElement} markScale={markScale} />
      </LiveCardIdentityContext>
    </div>
  )
}
