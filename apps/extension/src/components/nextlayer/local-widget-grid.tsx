import type { Color } from "@newsnext/shared/types"
import type { ComponentMap, GridStackHandle, GridStackNode, GridStackOptions } from "gridstack/dist/react"
import type { ReactNode, RefObject } from "react"
import type { LocalWidgetManifest, WidgetUi } from "./widget-manifest"
import type { NextLayerWidget } from "@/lib/board"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useQuery } from "@tanstack/react-query"
import { GridStack } from "gridstack/dist/react"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { PhArrowCircleLeftDuotone, PhInfoDuotone } from "@/components/icons/ph"
import { LiveCardHeaderActionButton } from "@/components/live-card/card-header"
import { LiveCardContentBackground, LiveCardContentTransition, LiveCardRefreshButton } from "@/components/live-card/card-refresh"
import { LiveCardSurface } from "@/components/live-card/card-surface"
import { useI18n } from "@/hooks/use-i18n"
import { useNativeIntegrationStatus } from "@/hooks/use-native-integration-status"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { actions } from "@/lib/actions"
import { isThemeColor } from "@/lib/settings/theme-color"
import { boardsAtom } from "@/store/board"
import { BuiltinLiveCard } from "./builtin-live-card"
import { widgetDataQueryOptions } from "./widget-data-query"
import { getChangedWidgetLayouts, getGridWidgetId } from "./widget-layout"
import { parseLocalWidgetManifests, parseWidgetUi } from "./widget-manifest"
import { bindWidgetSdk } from "./widget-sdk"
import "gridstack/dist/gridstack.css"

const WIDGET_PROTOCOL_VERSION = 1

interface WidgetFrameProps {
  color: Color
  active: boolean
  instanceIds: string[]
  title: string
  url?: string
  ui: WidgetUi
  dataRevision: string
  staleTimeMs: number
  refreshIntervalMs: number
  dataFiles: string[]
  widgetId: string
}

interface InstalledLocalWidget {
  manifest: LocalWidgetManifest
  placement: NextLayerWidget
}

function createGridOptions(
  widgets: InstalledLocalWidget[],
  boardInstanceIds: readonly string[],
  active: boolean,
): GridStackOptions {
  return {
    animate: true,
    cellHeight: 56,
    column: 12,
    columnOpts: {
      breakpoints: [
        { w: 640, c: 1, layout: "list" },
        { w: 960, c: 6, layout: "moveScale" },
      ],
      layout: "moveScale",
    },
    margin: 6,
    resizable: { handles: "e, se, s" },
    children: widgets.map(({ manifest, placement }) => {
      const instanceIds = placement.dataScope.type === "board"
        ? boardInstanceIds
        : placement.dataScope.instanceIds.filter(id => boardInstanceIds.includes(id))
      return {
        component: "localWidget",
        h: placement.layout.height,
        id: getGridWidgetId(manifest.id),
        minH: manifest.minHeight,
        minW: manifest.minWidth,
        props: {
          active,
          color: manifest.color,
          instanceIds: [...instanceIds],
          dataRevision: manifest.dataRevision,
          staleTimeMs: manifest.staleTimeMs,
          title: manifest.title,
          url: manifest.url,
          ui: manifest.view,
          refreshIntervalMs: manifest.refreshIntervalMs,
          dataFiles: manifest.dataFiles,
          widgetId: manifest.id,
        },
        w: placement.layout.width,
        x: placement.layout.x,
        y: placement.layout.y,
      }
    }),
  }
}

function LocalWidgetFrame(props: Record<string, unknown>) {
  const { t } = useI18n()
  const frame = parseFrameProps(props)
  const [isFlipped, setIsFlipped] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  useLayoutEffect(() => {
    const iframe = iframeRef.current
    if (iframe) return bindWidgetSdk(iframe)
  }, [frame.url])
  const loadedRef = useRef(false)
  const visible = useElementVisible(articleRef)
  const documentVisible = useDocumentVisible()
  const active = frame.active && visible && documentVisible
  const dataQuery = useQuery({
    ...widgetDataQueryOptions(frame),
    enabled: active,
  })
  const dataPayload = useMemo(() => dataQuery.error
    ? {
        error: dataQuery.error instanceof Error ? dataQuery.error.message : "Widget data request failed",
        ...dataQuery.data,
        queries: dataQuery.data?.queries ?? {},
        stale: true,
        status: "error",
      }
    : dataQuery.data ? { ...dataQuery.data, stale: false, status: "ready" } : { queries: {}, stale: true, status: "loading" }, [dataQuery.data, dataQuery.error])

  const postData = useCallback(() => {
    const contentWindow = iframeRef.current?.contentWindow
    if (!contentWindow) return
    contentWindow.postMessage({
      ...dataPayload,
      type: "newsnext.widget.data",
      version: WIDGET_PROTOCOL_VERSION,
      widgetId: frame.widgetId,
    }, "*")
  }, [frame.widgetId, dataPayload])

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>): void {
      if (event.source !== iframeRef.current?.contentWindow || !isWidgetReady(event.data)) return
      postData()
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [postData])
  useEffect(() => {
    if (loadedRef.current) postData()
  }, [postData])

  const refreshing = dataQuery.isFetching

  return (
    <article ref={articleRef} className={`relative h-full min-h-0 select-none ${frame.color}`}>
      <FlipAnimate rotate="y" flipped={isFlipped}>
        <WidgetFace
          title={frame.title}
          hidden={isFlipped}
          isFetching={refreshing}
          actions={(
            <>
              <LiveCardRefreshButton
                isFetching={refreshing}
                label={t("refreshWidget", { title: frame.title })}
                onRefresh={() => void dataQuery.refetch({ cancelRefetch: false })}
              />
              <LiveCardHeaderActionButton
                type="button"
                aria-label={t("widgetDetails")}
                onClick={() => setIsFlipped(true)}
              >
                <PhInfoDuotone />
              </LiveCardHeaderActionButton>
            </>
          )}
        >
          {frame.ui.type === "live-card"
            ? (
                <BuiltinLiveCard
                  ui={frame.ui}
                  title={frame.title}
                  isFetching={refreshing}
                  onRefresh={() => void dataQuery.refetch({ cancelRefetch: false })}
                  queries={dataQuery.data?.queries ?? {}}
                  statusMessage={refreshing
                    ? undefined
                    : dataQuery.error?.message ?? (
                      !dataQuery.data
                        ? t("widgetDataLoading")
                        : undefined
                    )}
                />
              )
            : (
                <iframe
                  ref={iframeRef}
                  className="relative size-full border-0 bg-transparent"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                  src={frame.url}
                  title={frame.title}
                  onLoad={() => {
                    loadedRef.current = true
                    postData()
                  }}
                />
              )}
        </WidgetFace>
        <WidgetFace
          title={frame.title}
          hidden={!isFlipped}
          actions={(
            <LiveCardHeaderActionButton
              type="button"
              aria-label={t("widgetFront")}
              onClick={() => setIsFlipped(false)}
            >
              <PhArrowCircleLeftDuotone />
            </LiveCardHeaderActionButton>
          )}
        >
          <dl className="relative h-full space-y-4 overflow-auto p-3 text-sm" onPointerDown={event => event.stopPropagation()}>
            <div>
              <dt className="text-muted-foreground">{t("widgetDataStatus")}</dt>
              <dd className="mt-1" role="status">
                {dataQuery.error
                  ? dataQuery.error.message
                  : t(
                      !dataQuery.data
                        ? "widgetDataLoading"
                        : "widgetDataReady",
                    )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("widgetDataSources")}</dt>
              <dd className="mt-1">
                {frame.dataFiles.length > 0 && <span className="block">{frame.dataFiles.join(", ")}</span>}
                {(frame.instanceIds.length > 0 || frame.dataFiles.length === 0) && t("instanceCount", { count: frame.instanceIds.length })}
              </dd>
            </div>
            {dataQuery.data?.refreshedAt !== undefined && (
              <div>
                <dt className="text-muted-foreground">{t("widgetUpdatedAt")}</dt>
                <dd className="mt-1"><RelativeTime date={dataQuery.data.refreshedAt} /></dd>
              </div>
            )}
          </dl>
        </WidgetFace>
      </FlipAnimate>
    </article>
  )
}

interface WidgetFaceProps {
  title: string
  hidden: boolean
  isFetching?: boolean
  actions: ReactNode
  children: ReactNode
}

function WidgetFace({ title, hidden, actions, children, isFetching = false }: WidgetFaceProps): React.JSX.Element {
  return (
    <div className="relative h-full min-h-0" inert={hidden} aria-hidden={hidden}>
      <LiveCardSurface />
      <div className="relative flex h-full min-h-0 flex-col p-2.5">
        <header className="mx-1 mb-2 flex min-h-8 shrink-0 cursor-grab items-center gap-2 active:cursor-grabbing">
          <p className="ml-1 min-w-0 flex-1 truncate text-base font-bold">{title}</p>
          <div
            className="flex shrink-0 cursor-auto items-center gap-1 text-theme-400"
            onClick={event => event.stopPropagation()}
            onPointerDown={event => event.stopPropagation()}
          >
            {actions}
          </div>
        </header>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
          <LiveCardContentBackground isFetching={isFetching} />
          <LiveCardContentTransition className="relative size-full" isFetching={isFetching}>
            {children}
          </LiveCardContentTransition>
        </div>
      </div>
    </div>
  )
}

function parseFrameProps(props: Record<string, unknown>): WidgetFrameProps {
  if (!isThemeColor(props.color)
    || typeof props.active !== "boolean"
    || typeof props.dataRevision !== "string"
    || !Number.isSafeInteger(props.staleTimeMs)
    || Number(props.staleTimeMs) < 0
    || !Array.isArray(props.instanceIds)
    || !props.instanceIds.every(id => typeof id === "string")
    || typeof props.title !== "string"
    || (props.url !== undefined && typeof props.url !== "string")
    || !Array.isArray(props.dataFiles)
    || !props.dataFiles.every(path => typeof path === "string")
    || !Number.isSafeInteger(props.refreshIntervalMs)
    || Number(props.refreshIntervalMs) < 60_000
    || typeof props.widgetId !== "string") {
    throw new TypeError("GridStack supplied invalid local Widget properties")
  }
  const ui = parseWidgetUi(props.ui)
  if (ui.type === "custom" && typeof props.url !== "string") throw new TypeError("Custom Widget UI requires an entry URL")
  return { ...props, ui } as unknown as WidgetFrameProps
}

function isWidgetReady(value: unknown): boolean {
  return isRecord(value) && value.type === "newsnext.widget.ready" && value.version === WIDGET_PROTOCOL_VERSION
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible")
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible")
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])
  return visible
}

function useElementVisible(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return visible
}

const LOCAL_WIDGET_COMPONENTS: ComponentMap = { localWidget: LocalWidgetFrame }

function useWidgetServerOrigin() {
  const query = useNativeIntegrationStatus()
  return { isLoading: query.isLoading, serverOrigin: query.data?.widgetServerOrigin, state: query.data?.state }
}

function useLocalWidgets(serverOrigin: string | undefined) {
  const query = useQuery({
    queryKey: ["local-widgets", serverOrigin],
    queryFn: async ({ signal }) => {
      if (!serverOrigin) return []
      const response = await fetch(`${serverOrigin}/widgets`, { signal })
      if (!response.ok) throw new Error(`Widget server returned HTTP ${response.status}`)
      return parseLocalWidgetManifests(await response.json(), serverOrigin)
    },
    enabled: serverOrigin !== undefined,
    refetchInterval: 5_000,
  })
  return {
    error: query.error instanceof Error ? query.error.message : undefined,
    isLoading: query.isLoading,
    widgets: query.data ?? [],
  }
}

interface LocalWidgetGridProps {
  boardId: string
  onReady?: () => void
  viewReady: boolean
}

export function LocalWidgetGrid({ boardId, onReady, viewReady }: LocalWidgetGridProps) {
  const { t } = useI18n()
  const gridRef = useRef<GridStackHandle>(null)
  const connection = useWidgetServerOrigin()
  const manifestQuery = useLocalWidgets(connection.serverOrigin)
  const boards = useAtomValue(boardsAtom)
  const board = boards.find(candidate => candidate.id === boardId)
  const widgets = useMemo(() => {
    const manifestsById = new Map(manifestQuery.widgets.map(widget => [widget.id, widget]))
    return board?.nextLayer.widgets.flatMap((placement) => {
      const manifest = manifestsById.get(placement.widgetId)
      return manifest ? [{ manifest, placement }] : []
    }) ?? []
  }, [board?.nextLayer.widgets, manifestQuery.widgets])
  const gridOptions = useMemo(
    () => createGridOptions(widgets, board?.instanceIds ?? [], viewReady),
    [board?.instanceIds, viewReady, widgets],
  )
  const gridKey = widgets.map(widget => `${widget.manifest.id}@${widget.manifest.url ?? JSON.stringify(widget.manifest.view)}`).join(":")
  const handleGridChange = useCallback((_event: Event, nodes: GridStackNode[]) => {
    if (!board || gridRef.current?.getGrid()?.getColumn() !== 12) return
    const updates = getChangedWidgetLayouts(nodes, board.nextLayer.widgets)
    if (updates.length === 0) return
    void actions.nextLayer.setWidgetLayouts({ boardId, widgets: updates }).catch((error) => {
      console.error("Failed to save Next Layer Widget layouts", error)
    })
  }, [board, boardId])

  const isLoading = connection.isLoading || manifestQuery.isLoading
  useLayoutEffect(() => {
    if (!isLoading) onReady?.()
  }, [gridKey, isLoading, onReady])

  if (isLoading) return null
  if (connection.state !== "connected" || !connection.serverOrigin) {
    return <NextLayerMessage>{t("connectAppForWidgets")}</NextLayerMessage>
  }
  if (manifestQuery.error) {
    return (
      <NextLayerMessage>
        {t("loadWidgetsFailed", { error: String(manifestQuery.error) })}
      </NextLayerMessage>
    )
  }
  if (board?.nextLayer.widgets.length === 0) return <NextLayerMessage>{t("noLocalWidgets")}</NextLayerMessage>
  if (widgets.length === 0) return <NextLayerMessage>{t("widgetFilesUnavailable")}</NextLayerMessage>

  return (
    <section aria-label={t("nextLayerWidgets")}>
      <GridStack
        key={`${boardId}:${gridKey}`}
        ref={gridRef}
        className="next-layer-grid"
        components={LOCAL_WIDGET_COMPONENTS}
        options={gridOptions}
        onChange={handleGridChange}
      />
    </section>
  )
}

function NextLayerMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">{children}</div>
}
