import type { FormEvent } from "react"
import type { Browser } from "#imports"
import type { StaticMessageKey } from "@/lib/i18n"
import type { SourceRegistryStateEntry, SourceRegistryStatus } from "@/lib/source/registry-cache"
import type { SourceDescriptor } from "@/typings/source"
import { Badge } from "@newsnext/ui/components/badge"
import { Button } from "@newsnext/ui/components/button"
import { Input } from "@newsnext/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { useAtom, useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { browser } from "#imports"
import { ConfigSection } from "@/components/common/config-section"
import { ConfirmDestructiveButton } from "@/components/common/confirm-destructive-button"
import {
  PhArrowCounterClockwise,
  PhArrowFatUp,
  PhPlusCircle,
  PhTrash,
} from "@/components/icons/ph"
import { SourceIcon } from "@/components/live-card/source-icon"
import { useI18n } from "@/hooks/use-i18n"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { MAX_REGISTRY_URLS, normalizeRegistryUrl } from "@/lib/settings"
import { requestSourcePermission } from "@/lib/source"
import {
  parseSourceRegistryState,
  SOURCE_REGISTRIES_REFRESH_KEY,
  SOURCE_REGISTRIES_STATE_KEY,
} from "@/lib/source/registry-cache"
import { instancesAtom } from "@/store/board"
import { registryUrlsAtom } from "@/store/settings"

const ALL_REGISTRIES = "__all__"
const BUNDLED_REGISTRY = "__bundled__"

const CATEGORY_LABEL_KEYS = {
  developer: "categoryDeveloper",
  entertainment: "categoryEntertainment",
  finance: "categoryFinance",
  forum: "categoryForum",
  news: "categoryNews",
  social: "categorySocial",
} as const satisfies Record<NonNullable<SourceDescriptor["provider"]["category"]>, StaticMessageKey>

const STATUS_CLASS: Record<SourceRegistryStatus, string> = {
  error: "bg-destructive",
  ready: "bg-emerald-500",
  stale: "bg-amber-500",
}

function getProviderId(sourceId: string): string {
  return sourceId.split(":", 1)[0] ?? sourceId
}

function getSourceTitle(source: SourceDescriptor): string {
  return source.metadata.title ?? source.id.split(":").at(-1) ?? source.id
}

function registryLabel(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function registryPermissionOrigin(value: string): string {
  const url = new URL(value)
  return `${url.protocol}//${url.hostname}/*`
}

export function RegistrySettings(): React.JSX.Element {
  const [registryUrls, setRegistryUrls] = useAtom(registryUrlsAtom)
  const [state, setState] = useState<SourceRegistryStateEntry[]>([])
  const [refreshStartedAt, setRefreshStartedAt] = useState<number>()

  useEffect(() => {
    const loadState = async (): Promise<void> => {
      const stored = await browser.storage.local.get(SOURCE_REGISTRIES_STATE_KEY)
      setState(parseSourceRegistryState(stored[SOURCE_REGISTRIES_STATE_KEY]))
    }
    const handleStorageChange = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (areaName !== "local") return
      const change = changes[SOURCE_REGISTRIES_STATE_KEY]
      if (change) setState(parseSourceRegistryState(change.newValue))
    }

    void loadState()
    browser.storage.onChanged.addListener(handleStorageChange)
    return () => browser.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const refresh = (): void => {
    const startedAt = Date.now()
    setRefreshStartedAt(startedAt)
    void browser.storage.local.set({ [SOURCE_REGISTRIES_REFRESH_KEY]: startedAt })
  }
  const refreshing = refreshStartedAt !== undefined
    && !state.some(entry => entry.checkedAt >= refreshStartedAt)

  return (
    <div className="space-y-6">
      <RegistryManager
        refreshing={refreshing}
        registryState={state}
        registryUrls={registryUrls}
        setRegistryUrls={setRegistryUrls}
        onRefresh={refresh}
      />
      <RegistrySourceBrowser registryState={state} registryUrls={registryUrls} />
    </div>
  )
}

function RegistryManager({
  refreshing,
  registryState,
  registryUrls,
  setRegistryUrls,
  onRefresh,
}: {
  refreshing: boolean
  registryState: SourceRegistryStateEntry[]
  registryUrls: string[]
  setRegistryUrls: (update: string[] | ((current: string[]) => string[])) => void
  onRefresh: () => void
}): React.JSX.Element {
  const { locale, t } = useI18n()
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string>()
  const stateByUrl = useMemo(
    () => new Map(registryState.map(entry => [entry.url, entry])),
    [registryState],
  )

  async function handleAdd(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(undefined)

    const registryUrl = normalizeRegistryUrl(draft)
    if (!registryUrl) {
      setError(t("invalidRegistryUrl"))
      return
    }
    const granted = await requestSourcePermission({
      origins: [registryPermissionOrigin(registryUrl)],
    })
    if (!granted) {
      setError(t("registryPermissionDenied"))
      return
    }

    setRegistryUrls(current => current.includes(registryUrl) ? current : [...current, registryUrl])
    setDraft("")
  }

  async function handleRefresh(): Promise<void> {
    setError(undefined)
    const granted = await requestSourcePermission({
      origins: [...new Set(registryUrls.map(registryPermissionOrigin))],
    })
    if (!granted) {
      setError(t("registryPermissionDenied"))
      return
    }
    onRefresh()
  }

  function moveRegistry(index: number, offset: -1 | 1): void {
    setRegistryUrls((current) => {
      const target = index + offset
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [url] = next.splice(index, 1)
      if (!url) return current
      next.splice(target, 0, url)
      return next
    })
  }

  return (
    <ConfigSection
      title={t("registryUrls")}
      description={t("registryUrlsDescription", { count: MAX_REGISTRY_URLS })}
      titleAccessory={registryUrls.length > 0
        ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
            >
              <PhArrowCounterClockwise className={refreshing ? "animate-spin" : undefined} />
              {refreshing ? t("updating") : t("refresh")}
            </Button>
          )
        : undefined}
      surfaceClassName="gap-3 p-4"
    >
      <form className="flex min-w-0 max-w-full items-center gap-2" onSubmit={handleAdd}>
        <Input
          aria-invalid={Boolean(error)}
          aria-label={t("registryUrl")}
          value={draft}
          spellCheck={false}
          inputMode="url"
          onChange={(event) => {
            setDraft(event.target.value)
            setError(undefined)
          }}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!draft.trim() || registryUrls.length >= MAX_REGISTRY_URLS}
        >
          <PhPlusCircle />
          {t("addRegistry")}
        </Button>
      </form>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      {registryUrls.length === 0
        ? (
            <div className="rounded-2xl bg-background/35 px-4 py-5 text-center">
              <p className="text-sm font-medium">{t("bundledRegistryActive")}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("noRegistriesConfigured")}</p>
            </div>
          )
        : (
            <ol className="grid gap-2">
              {registryUrls.map((url, index) => {
                const item = stateByUrl.get(url)
                const status = item?.status
                const updatedAtLabel = item?.updatedAt
                  ? t("registryUpdatedAt", {
                      time: new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(item.updatedAt),
                    })
                  : undefined
                return (
                  <li key={url} className="min-w-0 max-w-full overflow-hidden rounded-2xl bg-background/40 px-3 py-3">
                    <div className="flex min-w-0 max-w-full items-start gap-3 overflow-hidden">
                      <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-[11px] font-semibold text-muted-foreground">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden
                            className={`size-2 shrink-0 rounded-full ${status ? STATUS_CLASS[status] : "bg-muted-foreground/40"}`}
                          />
                          <span className="truncate text-sm font-semibold">{registryLabel(url)}</span>
                          <RegistryStatusBadge status={status} />
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          title={url}
                        >
                          {url}
                        </a>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{t("sourceCount", { count: item?.sourceIds.length ?? 0 })}</span>
                          {updatedAtLabel && <span>{updatedAtLabel}</span>}
                        </div>
                        {item?.error && (
                          <p className="mt-2 line-clamp-2 text-xs text-destructive" title={item.error}>{item.error}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          aria-label={t("moveRegistryUp")}
                          title={t("moveRegistryUp")}
                          onClick={() => moveRegistry(index, -1)}
                        >
                          <PhArrowFatUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === registryUrls.length - 1}
                          aria-label={t("moveRegistryDown")}
                          title={t("moveRegistryDown")}
                          onClick={() => moveRegistry(index, 1)}
                        >
                          <PhArrowFatUp className="rotate-180" />
                        </Button>
                        <ConfirmDestructiveButton
                          type="button"
                          appearance="icon-expand"
                          size="icon-sm"
                          icon={<PhTrash />}
                          label={t("removeRegistry")}
                          confirmLabel={t("confirmRemoveRegistry")}
                          resetAfterMs={3_000}
                          onConfirm={() => setRegistryUrls(current => current.filter(candidate => candidate !== url))}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
    </ConfigSection>
  )
}

function RegistryStatusBadge({ status }: { status?: SourceRegistryStatus }): React.JSX.Element {
  const { t } = useI18n()
  const label = status === "ready"
    ? t("registryReady")
    : status === "stale"
      ? t("registryStale")
      : status === "error"
        ? t("registryError")
        : t("checking")
  return (
    <Badge variant={status === "error" ? "destructive" : "outline"} className="shrink-0">
      {label}
    </Badge>
  )
}

function RegistrySourceBrowser({
  registryState,
  registryUrls,
}: {
  registryState: SourceRegistryStateEntry[]
  registryUrls: string[]
}): React.JSX.Element {
  const { t } = useI18n()
  const { error, isLoading, sources } = useSourceDescriptors()
  const instances = useAtomValue(instancesAtom)
  const [query, setQuery] = useState("")
  const [registryFilter, setRegistryFilter] = useState(ALL_REGISTRIES)
  const sourceOrigins = useMemo(() => {
    const origins = new Map<string, string>()
    for (const url of registryUrls) {
      const entry = registryState.find(candidate => candidate.url === url)
      for (const sourceId of entry?.sourceIds ?? []) origins.set(sourceId, url)
    }
    return origins
  }, [registryState, registryUrls])
  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return sources.filter((source) => {
      const origin = sourceOrigins.get(source.id) ?? BUNDLED_REGISTRY
      if (registryFilter !== ALL_REGISTRIES && registryFilter !== origin) return false
      if (!normalizedQuery) return true
      return [
        source.id,
        source.provider.title,
        source.provider.category,
        source.metadata.title,
        source.metadata.desc,
      ].some(value => value?.toLocaleLowerCase().includes(normalizedQuery))
    })
  }, [query, registryFilter, sourceOrigins, sources])
  const providers = useMemo(
    () => new Set(filteredSources.map(source => getProviderId(source.id))).size,
    [filteredSources],
  )
  const groupedSources = useMemo(() => {
    const groups = new Map<SourceDescriptor["provider"]["category"], SourceDescriptor[]>()
    for (const source of filteredSources) {
      const category = source.provider.category
      const group = groups.get(category) ?? []
      group.push(source)
      groups.set(category, group)
    }
    return [...groups].map(([category, groupSources]) => ({ category, sources: groupSources }))
  }, [filteredSources])
  const instanceCountsBySource = useMemo(() => {
    const counts = new Map<string, number>()
    for (const instance of instances) {
      counts.set(instance.sourceId, (counts.get(instance.sourceId) ?? 0) + 1)
    }
    return counts
  }, [instances])
  return (
    <ConfigSection
      title={t("sources")}
      description={t("registrySourcesDescription")}
      surfaceClassName="gap-4 p-4"
    >
      <div className="grid grid-cols-3 gap-2">
        <Metric label={t("sources")} value={filteredSources.length} />
        <Metric label={t("providers")} value={providers} />
        <Metric label={t("registries")} value={registryUrls.length + 1} />
      </div>
      <div className="flex min-w-0 max-w-full gap-2">
        <Input
          value={query}
          placeholder={t("searchSources")}
          onChange={event => setQuery(event.target.value)}
        />
        <Select value={registryFilter} onValueChange={value => value && setRegistryFilter(value)}>
          <SelectTrigger className="w-44 shrink-0">
            <span className="min-w-0 flex-1 truncate text-left">
              {registryFilter === ALL_REGISTRIES
                ? t("allRegistries")
                : registryFilter === BUNDLED_REGISTRY
                  ? t("bundled")
                  : registryLabel(registryFilter)}
            </span>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value={ALL_REGISTRIES}>{t("allRegistries")}</SelectItem>
            <SelectItem value={BUNDLED_REGISTRY}>{t("bundled")}</SelectItem>
            {registryUrls.map(url => (
              <SelectItem key={url} value={url}>
                <span className="max-w-72 truncate" title={url}>{registryLabel(url)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading
        ? <p className="py-8 text-center text-sm text-muted-foreground">{t("loadingSources")}</p>
        : error
          ? <p role="alert" className="py-8 text-center text-sm text-destructive">{t("loadSourcesFailed")}</p>
          : filteredSources.length === 0
            ? <p className="py-8 text-center text-sm text-muted-foreground">{t("noSourcesFound")}</p>
            : (
                <div className="space-y-5">
                  {groupedSources.map(group => (
                    <section key={group.category ?? BUNDLED_REGISTRY} className="min-w-0">
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <h3 className="text-xs font-semibold text-foreground/80">
                          {group.category
                            ? t(CATEGORY_LABEL_KEYS[group.category])
                            : t("uncategorized")}
                        </h3>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {group.sources.length}
                        </span>
                      </div>
                      <ul className="grid min-w-0 grid-cols-1 items-start gap-2 sm:grid-cols-2">
                        {group.sources.map(source => (
                          <SourceCard
                            key={source.id}
                            instanceCount={instanceCountsBySource.get(source.id) ?? 0}
                            origin={sourceOrigins.get(source.id)}
                            source={source}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
    </ConfigSection>
  )
}

function Metric({ label, value }: { label: string, value: number }): React.JSX.Element {
  return (
    <div className="rounded-2xl bg-background/40 px-3 py-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

function SourceCard({
  instanceCount,
  origin,
  source,
}: {
  instanceCount: number
  origin?: string
  source: SourceDescriptor
}): React.JSX.Element {
  const { t } = useI18n()
  const icon = useSourceIcon(source)
  const title = getSourceTitle(source)
  const parameterLabels = Object.values(source.params ?? {}).map(parameter => parameter.title)
  const networkTargets = source.capabilities.network
  const hasDetails = parameterLabels.length > 0 || networkTargets.length > 0
  return (
    <li className="min-w-0 max-w-full overflow-hidden rounded-2xl bg-background/40 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <SourceIcon
          className="shrink-0 rounded-md"
          color={source.provider.color}
          icon={icon}
          size="sm"
          title={title}
        />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={title}>
            {title}
          </p>
          <p
            className="max-w-[55%] shrink-0 truncate text-right font-mono text-[11px] text-muted-foreground"
            title={source.id}
          >
            {source.id}
          </p>
        </div>
      </div>
      {source.metadata.desc && (
        <p className="mt-2 min-w-0 [overflow-wrap:anywhere] text-xs leading-5 text-muted-foreground">
          {source.metadata.desc}
        </p>
      )}
      {hasDetails && (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1.5 rounded-xl bg-foreground/[0.035] px-2.5 py-2 text-[11px] leading-[18px]">
          {parameterLabels.length > 0 && (
            <>
              <dt className="font-medium text-foreground/70">{t("parameters")}</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere] text-muted-foreground">
                {parameterLabels.join(", ")}
              </dd>
            </>
          )}
          {networkTargets.length > 0 && (
            <>
              <dt className="font-medium text-foreground/70">{t("networkTargets")}</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere] font-mono text-muted-foreground">
                {networkTargets.join(", ")}
              </dd>
            </>
          )}
        </dl>
      )}
      <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-foreground/5 pt-2 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate">{source.provider.title}</span>
          {instanceCount > 0 && (
            <span className="shrink-0 rounded-full bg-foreground/5 px-1.5 py-0.5 tabular-nums text-foreground/70">
              {t("instanceCount", { count: instanceCount })}
            </span>
          )}
        </div>
        {origin
          ? (
              <a
                href={origin}
                target="_blank"
                rel="noreferrer"
                className="max-w-[45%] shrink-0 truncate underline-offset-2 hover:text-foreground hover:underline"
                title={origin}
              >
                {registryLabel(origin)}
              </a>
            )
          : <span className="max-w-[45%] shrink-0 truncate">{t("bundled")}</span>}
      </div>
    </li>
  )
}
