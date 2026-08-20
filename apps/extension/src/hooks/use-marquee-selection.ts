import type { PointerEventHandler } from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { getLiveCardMarqueeSelection } from "@/lib/board/live-card-reorder"

interface MarqueeRect {
  height: number
  left: number
  top: number
  width: number
}

interface UseMarqueeSelectionOptions {
  enabled: boolean
  instanceIds: string[]
}

interface MarqueeSelectionResult {
  marqueeRect: MarqueeRect | null
  onPointerCancel: PointerEventHandler<HTMLElement>
  onPointerDown: PointerEventHandler<HTMLElement>
  onPointerMove: PointerEventHandler<HTMLElement>
  onPointerUp: PointerEventHandler<HTMLElement>
  selectedInstanceIds: string[]
  setSelectedInstanceIds: (instanceIds: string[]) => void
}

interface SelectionStart {
  additive: boolean
  initialInstanceIds: string[]
  pointerId: number
  x: number
  y: number
}

const MARQUEE_ACTIVATION_DISTANCE = 4

export function useMarqueeSelection({
  enabled,
  instanceIds,
}: UseMarqueeSelectionOptions): MarqueeSelectionResult {
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([])
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)
  const selectionStartRef = useRef<SelectionStart | null>(null)
  const visibleSelectedInstanceIds = useMemo(() => {
    const instanceIdSet = new Set(instanceIds)
    return selectedInstanceIds.filter(id => instanceIdSet.has(id))
  }, [instanceIds, selectedInstanceIds])

  const onPointerDown: PointerEventHandler<HTMLElement> = useCallback((event) => {
    if (!enabled || event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest("[data-live-card-id]")) return

    const initialInstanceIds = event.shiftKey ? selectedInstanceIds : []
    selectionStartRef.current = {
      additive: event.shiftKey,
      initialInstanceIds,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedInstanceIds(initialInstanceIds)
    setMarqueeRect(null)
  }, [enabled, selectedInstanceIds])

  const onPointerMove: PointerEventHandler<HTMLElement> = useCallback((event) => {
    const start = selectionStartRef.current
    if (!start || start.pointerId !== event.pointerId) return

    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (distance < MARQUEE_ACTIVATION_DISTANCE) return
    event.preventDefault()

    const listRect = event.currentTarget.getBoundingClientRect()
    const left = Math.min(start.x, event.clientX)
    const right = Math.max(start.x, event.clientX)
    const top = Math.min(start.y, event.clientY)
    const bottom = Math.max(start.y, event.clientY)
    setMarqueeRect({
      height: bottom - top,
      left: left - listRect.left,
      top: top - listRect.top,
      width: right - left,
    })

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-live-card-id]"),
    ).flatMap((item) => {
      const id = item.dataset.liveCardId
      if (!id) return []
      const rect = item.getBoundingClientRect()
      return [{ id, top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }]
    })
    setSelectedInstanceIds(getLiveCardMarqueeSelection({
      initialIds: start.additive ? start.initialInstanceIds : [],
      items,
      marquee: { left, right, top, bottom },
    }))
  }, [])

  const finishSelection = useCallback((pointerId: number) => {
    const start = selectionStartRef.current
    if (!start || start.pointerId !== pointerId) return
    selectionStartRef.current = null
    setMarqueeRect(null)
  }, [])

  const onPointerUp: PointerEventHandler<HTMLElement> = useCallback((event) => {
    finishSelection(event.pointerId)
  }, [finishSelection])

  const onPointerCancel: PointerEventHandler<HTMLElement> = useCallback((event) => {
    const start = selectionStartRef.current
    if (!start || start.pointerId !== event.pointerId) return
    setSelectedInstanceIds(start.initialInstanceIds)
    finishSelection(event.pointerId)
  }, [finishSelection])

  return {
    marqueeRect,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    selectedInstanceIds: visibleSelectedInstanceIds,
    setSelectedInstanceIds,
  }
}
