import type { WidgetMetadata } from "@newsnext/sdk/models"
import type { Color } from "@newsnext/shared/types"
import type { SourceParamSchemaMap } from "@newsnext/source-kit/types"
import type { ReactNode, RefObject } from "react"
import type { SortableWidgetNode } from "./sortable-widget-grid"
import type { WidgetUi } from "./widget-manifest"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { useQuery } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { CardBackContent, CardShell } from "@/components/card-shell"
import { CardHeader, CardHeaderActionButton } from "@/components/card-shell/card-header"
import { CardContentBackground, CardContentTransition, CardRefreshButton } from "@/components/card-shell/card-refresh"
import { canDragCardHeader, generateCardDragPreview } from "@/components/card-shell/drag-preview"
import { CardMetadataSettings } from "@/components/card-shell/settings/metadata-settings"
import { ParameterSettings } from "@/components/card-shell/settings/parameter-settings"
import { PhArrowCircleLeftDuotone, PhInfoDuotone } from "@/components/icons/ph"
import { useI18n } from "@/hooks/use-i18n"
import { useNativeIntegrationStatus } from "@/hooks/use-native-integration-status"
import { useSortable } from "@/hooks/use-sortable"
import { useSourceParams } from "@/hooks/use-source-params"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { actions } from "@/lib/actions"
import { boardsAtom } from "@/store/board"
import { SortableWidgetGrid } from "./sortable-widget-grid"
import { useLiveWidgetData } from "./use-live-widget-data"
import { DeleteWidgetButton, WidgetBoardSelect } from "./widget-actions"
import { WidgetItemListContent } from "./widget-item-list-content"
import { clampWidgetWidth, getChangedWidgetLayouts, getGridWidgetId } from "./widget-layout"
import { parseLocalWidgetManifests } from "./widget-manifest"
import { bindWidgetSdk } from "./widget-sdk"

const WIDGET_PROTOCOL_VERSION = 1

interface LiveWidgetCardProps {
  metadata?: WidgetMetadata
  params?: SourceParamSchemaMap
  paramsValue?: Record<string, unknown>
  boardId: string
  color: Color
  active: boolean
  cardIds: string[]
  title: string
  url?: string
  ui: WidgetUi
  dataRevision: string
  refreshIntervalMs: number
  dataFiles: string[]
  widgetId: string
}

function LiveWidgetCard(frame: LiveWidgetCardProps) {
  const { t } = useI18n()
  const [previewMetadata, setPreviewMetadata] = useState<WidgetMetadata | null>(null)
  const title = frame.metadata?.title || frame.title
  const previewTitle = previewMetadata?.title ?? title
  const color = frame.metadata?.color ?? frame.color
  const previewColor = previewMetadata?.color ?? color
  const [isFlipped, setIsFlipped] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const { setNodeRef, setHandleRef } = useSortable({
    id: getGridWidgetId(frame.widgetId),
    kind: "widget",
    boardId: frame.boardId,
    widgetId: frame.widgetId,
    enabled: frame.active,
    canDrag: canDragCardHeader,
    onGenerateDragPreview: generateCardDragPreview,
  })
  const setArticleRef = useCallback((element: HTMLElement | null) => {
    articleRef.current = element
    setNodeRef(element)
  }, [setNodeRef])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  useLayoutEffect(() => {
    const iframe = iframeRef.current
    if (iframe) return bindWidgetSdk(iframe)
  }, [frame.url])
  const loadedRef = useRef(false)
  const visible = useElementVisible(articleRef)
  const documentVisible = useDocumentVisible()
  const active = frame.active && visible && documentVisible
  const parameterState = useSourceParams({ params: frame.params, initialValues: frame.paramsValue })
  const resolvedParams = useMemo(
    () => Object.fromEntries(Object.entries(frame.params ?? {}).map(([key, param]) => [
      key,
      parameterState.savedParams[key] ?? param.default,
    ])),
    [frame.params, parameterState.savedParams],
  )
  const dataQuery = useLiveWidgetData({ ...frame, params: resolvedParams }, active)
  async function saveParams(params: Record<string, unknown>): Promise<void> {
    await actions.nextLayer.setLiveWidgetParams({ boardId: frame.boardId, widgetId: frame.widgetId, params })
    parameterState.commitParams(params)
  }
  const dataPayload = useMemo(() => dataQuery.error
    ? {
        error: dataQuery.error.message,
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
      params: resolvedParams,
      type: "newsnext.widget.data",
      version: WIDGET_PROTOCOL_VERSION,
      widgetId: frame.widgetId,
    }, "*")
  }, [frame.widgetId, dataPayload, resolvedParams])

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

  return (
    <article ref={setArticleRef} className={`relative h-full min-h-0 select-none ${isFlipped ? previewColor : color}`}>
      <FlipAnimate rotate="y" flipped={isFlipped}>
        <WidgetFace
          avatarSeed={frame.widgetId}
          title={title}
          metadata={frame.metadata}
          headerRef={isFlipped ? undefined : setHandleRef}
          isFetching={dataQuery.isContentFetching}
          actions={(
            <>
              <CardRefreshButton
                isFetching={dataQuery.isFetching}
                label={t("refreshWidget", { title })}
                onRefresh={dataQuery.refetch}
              />
              <CardHeaderActionButton
                type="button"
                aria-label={t("widgetDetails")}
                onClick={() => setIsFlipped(true)}
              >
                <PhInfoDuotone />
              </CardHeaderActionButton>
            </>
          )}
        >
          {frame.ui.type === "live-card"
            ? (
                <WidgetItemListContent
                  color={color}
                  ui={frame.ui}
                  title={title}
                  isFetching={dataQuery.isContentFetching}
                  onRefresh={dataQuery.refetch}
                  queries={dataQuery.data?.queries ?? {}}
                  statusMessage={dataQuery.isContentFetching
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
                  title={title}
                  onLoad={() => {
                    loadedRef.current = true
                    postData()
                  }}
                />
              )}
        </WidgetFace>
        <WidgetFace
          avatarSeed={frame.widgetId}
          title={previewTitle || frame.title}
          metadata={{ ...frame.metadata, ...previewMetadata }}
          headerRef={isFlipped ? setHandleRef : undefined}
          back
          actions={(
            <>
              <DeleteWidgetButton boardId={frame.boardId} widgetId={frame.widgetId} />
              <CardHeaderActionButton
                type="button"
                aria-label={t("widgetFront")}
                onClick={() => setIsFlipped(false)}
              >
                <PhArrowCircleLeftDuotone />
              </CardHeaderActionButton>
            </>
          )}
        >
          <WidgetBoardSelect boardId={frame.boardId} widgetId={frame.widgetId} />
          <CardMetadataSettings
            metadata={{ ...frame.metadata, title, color }}
            onPreviewMetadataChange={setPreviewMetadata}
            onReset={async () => {
              await actions.nextLayer.setLiveWidgetMetadata({ boardId: frame.boardId, widgetId: frame.widgetId, metadata: {} })
            }}
            onSave={async (metadata) => {
              await actions.nextLayer.setLiveWidgetMetadata({ boardId: frame.boardId, widgetId: frame.widgetId, metadata: { ...frame.metadata, ...metadata } })
            }}
          />
          <ParameterSettings
            params={frame.params}
            draftSourceParams={parameterState.draftParams}
            hasSourceParams={parameterState.hasParams}
            hasSourceParamChanges={parameterState.isDirty}
            sourceParamValidation={parameterState.validation}
            onSourceParamChange={parameterState.updateDraftParam}
            onSaveSourceParams={() => saveParams(parameterState.getDraftParams())}
            onResetSourceParams={() => saveParams({})}
            onDiscardSourceParams={parameterState.discardDraftParams}
          />
          <dl className="space-y-4">
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
                {(frame.cardIds.length > 0 || frame.dataFiles.length === 0) && t("liveCardCount", { count: frame.cardIds.length })}
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
  avatarSeed: string
  metadata?: WidgetMetadata
  title: string
  headerRef?: (element: HTMLDivElement | null) => void
  back?: boolean
  isFetching?: boolean
  actions: ReactNode
  children: ReactNode
}

function WidgetFace({ avatarSeed, title, metadata, headerRef, back = false, actions, children, isFetching = false }: WidgetFaceProps): React.JSX.Element {
  return (
    <CardShell header={<CardHeader avatarSeed={avatarSeed} title={title} providerTitle={title} badge={metadata?.badge} desc={metadata?.desc} home={metadata?.home} dragHandleRef={headerRef} actions={actions} />}>
      {back
        ? <CardBackContent>{children}</CardBackContent>
        : (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
              <CardContentBackground isFetching={isFetching} />
              <CardContentTransition className="relative size-full" isFetching={isFetching}>
                {children}
              </CardContentTransition>
            </div>
          )}
    </CardShell>
  )
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

interface LiveWidgetGridProps {
  boardId: string
  onReady?: () => void
  viewReady: boolean
}

export function LiveWidgetGrid({ boardId, onReady, viewReady }: LiveWidgetGridProps) {
  const { t } = useI18n()
  const connection = useWidgetServerOrigin()
  const manifestQuery = useLocalWidgets(connection.serverOrigin)
  const boards = useAtomValue(boardsAtom)
  const board = boards.find(candidate => candidate.id === boardId)
  const widgets = useMemo(() => {
    const manifestsById = new Map(manifestQuery.widgets.map(widget => [widget.id, widget]))
    return board?.nextLayer.liveWidgets.flatMap((placement) => {
      const manifest = manifestsById.get(placement.widgetId)
      return manifest ? [{ manifest, placement }] : []
    }) ?? []
  }, [board?.nextLayer.liveWidgets, manifestQuery.widgets])
  const nodes = useMemo<SortableWidgetNode[]>(() => widgets.map(({ manifest, placement }) => ({
    id: getGridWidgetId(placement.widgetId),
    x: placement.layout.x,
    y: placement.layout.y,
    w: Math.max(clampWidgetWidth(manifest.minWidth), clampWidgetWidth(placement.layout.width)),
    h: Math.max(manifest.minHeight, placement.layout.height),
    minW: clampWidgetWidth(manifest.minWidth),
    minH: manifest.minHeight,
  })), [widgets])
  const saveLayout = useCallback(async (layout: SortableWidgetNode[]) => {
    if (!board) return
    const updates = getChangedWidgetLayouts(layout, board.nextLayer.liveWidgets)
    if (updates.length > 0) await actions.nextLayer.setLiveWidgetLayouts({ boardId, liveWidgets: updates })
  }, [board, boardId])
  const isLoading = connection.isLoading || manifestQuery.isLoading
  useLayoutEffect(() => {
    if (!isLoading && (widgets.length === 0 || connection.state !== "connected" || manifestQuery.error)) onReady?.()
  }, [connection.state, isLoading, manifestQuery.error, onReady, widgets.length])

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
  if (board?.nextLayer.liveWidgets.length === 0) return <NextLayerMessage>{t("noLocalWidgets")}</NextLayerMessage>
  if (widgets.length === 0) return <NextLayerMessage>{t("widgetFilesUnavailable")}</NextLayerMessage>

  return (
    <SortableWidgetGrid key={boardId} onReady={onReady} nodes={nodes} enabled={viewReady} label={t("nextLayerWidgets")} onLayoutChange={saveLayout}>
      {widgets.map(({ manifest, placement }) => (
        <LiveWidgetCard
          key={placement.widgetId}
          boardId={boardId}
          widgetId={placement.widgetId}
          active={viewReady}
          color={manifest.color}
          cardIds={placement.dataScope.type === "board"
            ? board?.cardIds ?? []
            : placement.dataScope.cardIds.filter(id => board?.cardIds.includes(id))}
          title={manifest.title}
          url={manifest.url}
          ui={manifest.view}
          params={manifest.params}
          paramsValue={placement.params}
          metadata={placement.metadata}
          dataRevision={manifest.dataRevision}
          refreshIntervalMs={manifest.refreshIntervalMs}
          dataFiles={manifest.dataFiles}
        />
      ))}
    </SortableWidgetGrid>
  )
}

function NextLayerMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">{children}</div>
}
