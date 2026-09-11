import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { KeyboardEvent, PointerEvent, ReactNode } from "react"
import type { WidgetDropTarget } from "./widget-layout"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { DndContext } from "@/hooks/use-dnd-context"
import { isSortableData } from "@/lib/board"
import { isDropWithin } from "@/lib/board/drop-target"
import { getClosestWidgetDropTarget, getResizedWidgetSize, getWidgetColumns, getWidgetDropTargets, getWidgetGridLayout, WIDGET_COLUMN_WIDTH, WIDGET_GAP, WIDGET_ROW_HEIGHT } from "./widget-layout"

export interface SortableWidgetNode {
  id: string
  x: number
  y: number
  w: number
  h: number
  minW: number
  minH: number
}

interface SortableWidgetGridProps {
  children: ReactNode[]
  enabled: boolean
  label: string
  nodes: SortableWidgetNode[]
  onReady?: () => void
  onLayoutChange: (nodes: SortableWidgetNode[]) => Promise<void>
}

interface DragSession {
  original: SortableWidgetNode[]
  preview: SortableWidgetNode[]
  targets: WidgetDropTarget<SortableWidgetNode>[]
  target?: WidgetDropTarget<SortableWidgetNode>
  sourceId: string
  columns: number
  grabX: number
  grabY: number
}

type ResizeAxis = "width" | "height" | "both"
interface ResizeSession {
  original: SortableWidgetNode[]
  preview: SortableWidgetNode[]
  node: SortableWidgetNode
  axis: ResizeAxis
  clientX: number
  clientY: number
}

export function SortableWidgetGrid({ children, enabled, label, nodes, onLayoutChange, onReady }: SortableWidgetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragSession | null>(null)
  const resizeRef = useRef<ResizeSession | null>(null)
  const { rootScrollContainerRef } = useScrollProgressContext()
  const [availableWidth, setAvailableWidth] = useState(0)
  const [draft, setDraft] = useState<{ source: string, nodes: SortableWidgetNode[] } | null>(null)
  const [dragHeight, setDragHeight] = useState(0)
  const readyRef = useRef(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [resizingId, setResizingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const sourceVersion = JSON.stringify(nodes)
  const savedOrder = useMemo(() => [...nodes].sort((a, b) => a.y - b.y || a.x - b.x), [nodes])
  const ordered = draft?.source === sourceVersion ? draft.nodes : savedOrder
  const columns = getWidgetColumns(availableWidth, ordered)
  const layout = useMemo(() => getWidgetGridLayout(columns, ordered), [columns, ordered])
  const byId = new Map(layout.map(node => [node.id, node]))
  const width = columns * WIDGET_COLUMN_WIDTH - WIDGET_GAP
  const height = Math.max(dragHeight, ...layout.map(node => (node.y + node.h) * WIDGET_ROW_HEIGHT - WIDGET_GAP))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailableWidth(entry.contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (availableWidth > 0 && !readyRef.current) {
      readyRef.current = true
      onReady?.()
    }
  }, [availableWidth, onReady])

  const commit = useCallback((next: SortableWidgetNode[]) => {
    const change = { source: sourceVersion, nodes: next }
    setDraft(change)
    setSaveError(null)
    void onLayoutChange(next).catch((error: unknown) => {
      setDraft(current => current === change ? null : current)
      setSaveError(error instanceof Error ? error.message : "Failed to save widget layout")
    })
  }, [onLayoutChange, sourceVersion])

  const onDragStart = useCallback(({ source, location }: ElementEventBasePayload) => {
    if (!enabled || !isSortableData(source.data, "widget")) return
    const bounds = source.element.getBoundingClientRect()
    const targets = getWidgetDropTargets(columns, layout, source.data.id)
    dragRef.current = {
      original: layout,
      preview: layout,
      sourceId: source.data.id,
      columns,
      targets,
      target: targets[0],
      grabX: location.initial.input.clientX - bounds.left,
      grabY: location.initial.input.clientY - bounds.top,
    }
    setDragHeight(Math.max(0, ...layout.map(node => (node.y + node.h) * WIDGET_ROW_HEIGHT - WIDGET_GAP)))
    setDraggingId(source.data.id)
  }, [columns, enabled, layout])

  const onDrag = useCallback((args: ElementEventBasePayload) => {
    const { location } = args
    const drag = dragRef.current
    const grid = gridRef.current
    if (!drag || !grid) return
    if (!isDropWithin(args, grid)) {
      drag.target = undefined
      if (drag.preview !== drag.original) {
        drag.preview = drag.original
        setDraft({ source: sourceVersion, nodes: drag.original })
      }
      return
    }
    if (drag.columns !== columns) {
      drag.columns = columns
      drag.targets = getWidgetDropTargets(columns, drag.original, drag.sourceId)
      drag.target = undefined
    }
    const bounds = grid.getBoundingClientRect()
    const target = getClosestWidgetDropTarget(drag.targets, {
      x: (location.current.input.clientX - drag.grabX - bounds.left) / WIDGET_COLUMN_WIDTH,
      y: (location.current.input.clientY - drag.grabY - bounds.top) / WIDGET_ROW_HEIGHT,
    }, { width: WIDGET_COLUMN_WIDTH, height: WIDGET_ROW_HEIGHT }, drag.target)
    if (!target || target === drag.target) return
    drag.target = target
    drag.preview = target.layout
    setDraft({ source: sourceVersion, nodes: drag.preview })
  }, [columns, sourceVersion])

  const onDrop = useCallback((args: ElementEventBasePayload) => {
    const drag = dragRef.current
    dragRef.current = null
    setDraggingId(null)
    setDragHeight(0)
    if (!drag) return
    if (drag.target && isDropWithin(args, gridRef.current)) {
      commit(drag.preview)
    } else {
      setDraft({ source: sourceVersion, nodes: drag.original })
    }
  }, [commit, sourceVersion])

  const startResize = (event: PointerEvent<HTMLButtonElement>, node: SortableWidgetNode, axis: ResizeAxis) => {
    if (!enabled || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeRef.current = { original: layout, preview: layout, node, axis, clientX: event.clientX, clientY: event.clientY }
    setResizingId(node.id)
  }
  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    if (!resize) return
    const size = getResizedWidgetSize(resize.node, {
      x: resize.axis === "height" ? 0 : event.clientX - resize.clientX,
      y: resize.axis === "width" ? 0 : event.clientY - resize.clientY,
    })
    const previous = resize.preview.find(node => node.id === resize.node.id)
    if (previous?.w === size.w && previous.h === size.h) return
    resize.preview = resize.original.map(node => node.id === resize.node.id ? { ...node, ...size } : node)
    setDraft({ source: sourceVersion, nodes: resize.preview })
  }
  const endResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    resizeRef.current = null
    setResizingId(null)
    if (!resize) return
    if (event.type === "pointercancel") {
      setDraft({ source: sourceVersion, nodes: resize.original })
    } else {
      const nextColumns = getWidgetColumns(availableWidth, resize.preview)
      commit(getWidgetGridLayout(nextColumns, resize.preview))
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const keyResize = (event: KeyboardEvent<HTMLButtonElement>, node: SortableWidgetNode, axis: ResizeAxis) => {
    if (event.key === "Escape" && resizeRef.current) {
      setDraft({ source: sourceVersion, nodes: resizeRef.current.original })
      resizeRef.current = null
      setResizingId(null)
      return
    }
    const x = axis !== "height" ? ({ ArrowLeft: -WIDGET_COLUMN_WIDTH, ArrowRight: WIDGET_COLUMN_WIDTH }[event.key]) ?? 0 : 0
    const y = axis !== "width" ? ({ ArrowUp: -WIDGET_ROW_HEIGHT, ArrowDown: WIDGET_ROW_HEIGHT }[event.key]) ?? 0 : 0
    if (!x && !y) return
    event.preventDefault()
    const size = getResizedWidgetSize(node, { x, y })
    const next = layout.map(candidate => candidate.id === node.id ? { ...candidate, ...size } : candidate)
    commit(getWidgetGridLayout(getWidgetColumns(availableWidth, next), next))
  }

  return (
    <section aria-label={label}>
      {saveError && <p role="alert" className="mb-3 text-sm text-destructive">{saveError}</p>}
      <div ref={containerRef} className="widget-scroll-container scrollbar-hidden" data-overflow={availableWidth > 0 && width > availableWidth ? "true" : undefined}>
        <DndContext
          kind="widget"
          dropTargetRef={gridRef}
          verticalScrollRef={enabled ? rootScrollContainerRef : undefined}
          horizontalScrollRef={enabled ? containerRef : undefined}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDrop={onDrop}
        >
          <div
            ref={gridRef}
            role="list"
            className="widget-grid"
            data-interacting={draggingId || resizingId ? "true" : undefined}
            style={{ width, height }}
          >
            {nodes.map((original, index) => {
              const node = byId.get(original.id)
              if (!node) return null
              return (
                <div
                  key={node.id}
                  role="listitem"
                  aria-posinset={layout.indexOf(node) + 1}
                  aria-setsize={nodes.length}
                  className="widget-slot"
                  style={{
                    left: node.x * WIDGET_COLUMN_WIDTH,
                    top: node.y * WIDGET_ROW_HEIGHT,
                    width: node.w * WIDGET_COLUMN_WIDTH - WIDGET_GAP,
                    height: node.h * WIDGET_ROW_HEIGHT - WIDGET_GAP,
                  }}
                >
                  <div data-widget-transition className="relative h-full">
                    <div className={`h-full ${draggingId === node.id ? "card-drag-placeholder" : ""}`}>
                      {children[index]}
                    </div>
                    {enabled && (["width", "height", "both"] as const).map(axis => (
                      <button
                        key={axis}
                        type="button"
                        aria-label={`Resize widget ${axis === "both" ? "width and height" : axis}`}
                        className={`widget-resize-handle widget-resize-${axis}`}
                        onPointerDown={event => startResize(event, node, axis)}
                        onPointerMove={moveResize}
                        onPointerUp={endResize}
                        onPointerCancel={endResize}
                        onKeyDown={event => keyResize(event, node, axis)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </DndContext>
      </div>
    </section>
  )
}
