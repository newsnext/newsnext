import type { SourceDescriptor } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { Input } from "@newsnext/ui/components/input"
import { overlayScrollbarsRef } from "@newsnext/ui/hooks/use-overlay-scrollbars"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { SourceIcon } from "@/components/card-shell/source-icon"
import { ConfigSection } from "@/components/common/config-section"
import { useI18n } from "@/hooks/use-i18n"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { actions } from "@/lib/actions"

export function SourcesSettings(): React.JSX.Element {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const catalog = useQuery({
    queryKey: ["source-catalog"],
    queryFn: () => actions.source.list(),
    networkMode: "always",
  })
  const query = search.trim().toLowerCase()
  const availableSources = catalog.data ?? []
  const sources = query
    ? availableSources.filter(source => [
        source.id,
        source.provider.title,
        source.metadata.title,
        source.metadata.badge,
        source.metadata.desc,
      ].some(value => value?.toLowerCase().includes(query)))
    : availableSources

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConfigSection
        className="shrink-0 pt-6.5 pr-6.5 pl-4 sm:pt-8.5 sm:pr-8.5 sm:pl-6"
        title={t("sources")}
        description={t("sourcesDescription")}
        titleAccessory={catalog.data && (
          <span className="text-xs font-normal text-muted-foreground" role="status">
            {t("sourceCount", { count: sources.length, total: catalog.data.length })}
          </span>
        )}
        surface={false}
      >
        <Input
          type="search"
          aria-label={t("searchSources")}
          placeholder={t("searchSources")}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </ConfigSection>
      {/* Keep the list on its own composited viewport beneath the fixed search controls. */}
      <div
        ref={overlayScrollbarsRef}
        tabIndex={0}
        role="region"
        aria-label={t("sources")}
        className="mt-3 min-h-0 flex-1 transform-gpu overflow-y-auto pr-6.5 pb-6.5 pl-4 sm:pr-8.5 sm:pb-8.5 sm:pl-6"
      >
        {catalog.isPending
          ? <p role="status" className="px-2.5 py-4 text-sm text-muted-foreground">{t("loadingSources")}</p>
          : catalog.isError
            ? (
                <div role="alert" className="space-y-2 px-2.5 py-4">
                  <p className="text-sm text-destructive">{t("loadSourcesFailed")}</p>
                  <Button size="sm" variant="outline" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>
                    {t("retry")}
                  </Button>
                </div>
              )
            : sources.length === 0
              ? <p role="status" className="px-2.5 py-4 text-sm text-muted-foreground">{t("noSourcesFound")}</p>
              : (
                  <ul className="divide-y divide-border/50">
                    {sources.map(source => <SourceRow key={source.id} source={source} />)}
                  </ul>
                )}
      </div>
    </div>
  )
}

function SourceRow({ source }: { source: SourceDescriptor }): React.JSX.Element {
  const icon = useSourceIcon(source)
  const title = source.metadata.title || source.provider.title

  return (
    <li className="flex min-w-0 gap-3 px-2.5 py-3">
      <SourceIcon icon={icon} title={source.provider.title} color={source.provider.color} size="sm" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="wrap-anywhere font-medium">{title}</span>
          {source.metadata.badge && <span className="text-xs text-muted-foreground">{source.metadata.badge}</span>}
        </div>
        {title !== source.provider.title && <p className="text-xs text-muted-foreground">{source.provider.title}</p>}
        {source.metadata.desc && <p className="wrap-anywhere text-xs text-muted-foreground">{source.metadata.desc}</p>}
        <p className="wrap-anywhere font-mono text-xs text-muted-foreground">{source.id}</p>
      </div>
    </li>
  )
}
