import type { ComponentMap, GridStackHandle, GridStackNode, GridStackOptions } from "gridstack/dist/react"
import type { RefObject } from "react"
import type { LocalWidgetManifest } from "./widget-manifest"
import type { NextLayerWidget } from "@/lib/board"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useQuery } from "@tanstack/react-query"
import { GridStack } from "gridstack/dist/react"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCardEntrance } from "@/components/board-view/use-card-entrance"
import { PhArrowCounterClockwiseDuotone, PhCircleDashedDuotone } from "@/components/icons/ph"
import { LiveCardHeaderActionButton } from "@/components/live-card/card-header"
import { LiveCardSurface } from "@/components/live-card/card-surface"
import { useI18n } from "@/hooks/use-i18n"
import { actions } from "@/lib/actions"
import { boardsAtom } from "@/store/board"
import { getChangedWidgetLayouts, getGridWidgetId } from "./widget-layout"
import { parseLocalWidgetManifests } from "./widget-manifest"
import "gridstack/dist/gridstack.css"

const WIDGET_PROTOCOL_VERSION = 1

interface WidgetSnapshot {
  queries: Record<string, unknown>
  refreshedAt?: number
  revision?: number
  stale: boolean
  status: "missing" | "ready"
}

interface WidgetFrameProps {
  active: boolean
  boardId: string
  scopeKey: string
  title: string
  url: string
  widgetId: string
}

interface InstalledLocalWidget {
  manifest: LocalWidgetManifest
  placement: NextLayerWidget
}

function createGridOptions(
  widgets: InstalledLocalWidget[],
  boardId: string,
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
    children: widgets.map(({ manifest, placement }) => ({
      component: "localWidget",
      h: placement.layout.height,
      id: getGridWidgetId(manifest.id),
      minH: manifest.minHeight,
      minW: manifest.minWidth,
      props: {
        active,
        boardId,
        scopeKey: JSON.stringify(placement.dataScope.type === "board"
          ? boardInstanceIds
          : placement.dataScope.instanceIds.filter(id => boardInstanceIds.includes(id))),
        title: manifest.title,
        url: manifest.url,
        widgetId: manifest.id,
      },
      w: placement.layout.width,
      x: placement.layout.x,
      y: placement.layout.y,
    })),
  }
}

function LocalWidgetFrame(props: Record<string, unknown>) {
  const { t } = useI18n()
  const frame = parseFrameProps(props)
  const articleRef = useRef<HTMLElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadedRef = useRef(false)
  const visible = useElementVisible(articleRef)
  const documentVisible = useDocumentVisible()
  const active = frame.active && visible && documentVisible
  const snapshot = useQuery({
    queryKey: ["nextLayer", "widgetSnapshot", frame.boardId, frame.widgetId, frame.scopeKey],
    queryFn: async () => parseWidgetSnapshot(await actions.nextLayer.getWidgetSnapshot({
      boardId: frame.boardId,
      widgetId: frame.widgetId,
    })),
    enabled: active,
    refetchInterval: query => query.state.data?.status === "missing" ? 2_000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  })
  const snapshotPayload = useMemo(() => snapshot.error
    ? {
        error: snapshot.error instanceof Error ? snapshot.error.message : "Widget Snapshot failed",
        queries: {},
        stale: true,
        status: "error",
      }
    : snapshot.data ?? { queries: {}, stale: true, status: "loading" }, [snapshot.data, snapshot.error])

  const postData = useCallback(() => {
    const contentWindow = iframeRef.current?.contentWindow
    if (!contentWindow) return
    contentWindow.postMessage({
      ...snapshotPayload,
      type: "newsnext.widget.data",
      version: WIDGET_PROTOCOL_VERSION,
      widgetId: frame.widgetId,
    }, "*")
  }, [frame.widgetId, snapshotPayload])

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

  const refreshing = snapshot.isFetching

  return (
    <article ref={articleRef} className="relative h-full min-h-0 select-none">
      <LiveCardSurface />
      <div className="relative flex h-full min-h-0 flex-col p-2.5">
        <header className="mx-1 mb-3 flex min-h-8 shrink-0 cursor-grab items-center gap-2 active:cursor-grabbing">
          <p className="ml-1 min-w-0 flex-1 truncate text-base font-bold">{frame.title}</p>
          <div
            className="flex shrink-0 cursor-auto items-center gap-1 text-theme-400"
            onClick={event => event.stopPropagation()}
          >
            <LiveCardHeaderActionButton
              className={refreshing ? "animate-spin" : undefined}
              type="button"
              aria-label={t("refreshWidget", { title: frame.title })}
              disabled={refreshing}
              onClick={() => void snapshot.refetch()}
              onPointerDown={event => event.stopPropagation()}
            >
              {refreshing ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
            </LiveCardHeaderActionButton>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
          <SquircleBox
            aria-hidden
            radius="2xl"
            className="pointer-events-none absolute inset-0 bg-background/70 zenith-theme-400"
          />
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
        </div>
      </div>
    </article>
  )
}

function parseWidgetSnapshot(value: unknown): WidgetSnapshot {
  if (!isRecord(value)
    || !isRecord(value.queries)
    || typeof value.stale !== "boolean"
    || (value.status !== "missing" && value.status !== "ready")
    || (value.status === "ready" && (
      !Number.isInteger(value.refreshedAt)
      || Number(value.refreshedAt) <= 0
      || !Number.isInteger(value.revision)
      || Number(value.revision) <= 0
    ))) {
    throw new TypeError("The NewsNext App returned an invalid Widget Snapshot")
  }
  return {
    queries: value.queries,
    ...(value.status === "ready"
      ? { refreshedAt: Number(value.refreshedAt), revision: Number(value.revision) }
      : {}),
    stale: value.stale,
    status: value.status,
  }
}

function parseFrameProps(props: Record<string, unknown>): WidgetFrameProps {
  if (typeof props.active !== "boolean"
    || typeof props.boardId !== "string"
    || typeof props.scopeKey !== "string"
    || typeof props.title !== "string"
    || typeof props.url !== "string"
    || typeof props.widgetId !== "string") {
    throw new TypeError("GridStack supplied invalid local Widget properties")
  }
  return props as unknown as WidgetFrameProps
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

function useWidgetServerUrl() {
  const query = useQuery({
    queryKey: ["app-integration-status"],
    queryFn: () => actions.appIntegration.getStatus(),
    refetchInterval: 2_000,
  })
  return { isLoading: query.isLoading, serverUrl: query.data?.widgetServerUrl, state: query.data?.state }
}

function useLocalWidgets(serverUrl: string | undefined) {
  const query = useQuery({
    queryKey: ["local-widgets", serverUrl],
    queryFn: async ({ signal }) => {
      if (!serverUrl) return []
      const response = await fetch(`${serverUrl}/widgets`, { signal })
      if (!response.ok) throw new Error(`Widget server returned HTTP ${response.status}`)
      return parseLocalWidgetManifests(await response.json(), serverUrl)
    },
    enabled: serverUrl !== undefined,
    refetchInterval: 5_000,
  })
  return {
    error: query.error instanceof Error ? query.error.message : undefined,
    isLoading: query.isLoading,
    widgets: query.data ?? [],
  }
}

export function LocalWidgetGrid({ boardId, entranceReady }: { boardId: string, entranceReady: boolean }) {
  const { t } = useI18n()
  const { rootScrollContainerRef } = useScrollProgressContext()
  const gridRef = useRef<GridStackHandle>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const connection = useWidgetServerUrl()
  const manifestQuery = useLocalWidgets(connection.serverUrl)
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
    () => createGridOptions(widgets, boardId, board?.instanceIds ?? [], entranceReady),
    [board?.instanceIds, boardId, entranceReady, widgets],
  )
  const gridKey = widgets.map(widget => `${widget.manifest.id}@${widget.manifest.url}`).join(":")
  const handleGridChange = useCallback((_event: Event, nodes: GridStackNode[]) => {
    if (!board || gridRef.current?.getGrid()?.getColumn() !== 12) return
    const updates = getChangedWidgetLayouts(nodes, board.nextLayer.widgets)
    if (updates.length === 0) return
    void actions.nextLayer.setWidgetLayouts({ boardId, widgets: updates }).catch((error) => {
      console.error("Failed to save Next Layer Widget layouts", error)
    })
  }, [board, boardId])

  useCardEntrance({
    active: entranceReady,
    containerRef: sectionRef,
    itemSelector: ".grid-stack-item:not(.grid-stack-placeholder) > .grid-stack-item-content",
    scrollContainerRef: rootScrollContainerRef,
  })

  if (connection.isLoading || manifestQuery.isLoading) return null
  if (connection.state !== "connected" || !connection.serverUrl) {
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
    <section ref={sectionRef} aria-label={t("nextLayerWidgets")}>
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
