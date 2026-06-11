import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import type { RefObject } from "react"
import type { BoardSource } from "@/typings/source"
import { useThrottleFn } from "@newsnext/ui/hooks/use-throttle-fn"
import { m } from "motion/react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { DndContext } from "@/hooks/use-dnd-context"
import Card from "../card"
import { DraggableCard } from "../card/draggable-card"

const ANIMATION_DURATION = 0.2 // 200ms
const SCATTER_STAGGER = 0.01

interface ScatterVector {
  x: number
  y: number
}

interface VisibleBounds {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

interface ScatterItemCustom {
  index: number
  scatterIndex: number
  hasScattered: boolean
  vector?: ScatterVector
}

interface DesktopBoardProps {
  sourceIds: string[]
  sourcesMap: Record<string, BoardSource>
  isSortable?: boolean
  className?: string
  isScattered?: boolean
  onSourceIdsChange?: (sourceIds: string[]) => void
  containerRef?: RefObject<HTMLDivElement | null>
}

export function DesktopBoard({
  sourceIds,
  sourcesMap,
  isSortable = false,
  className,
  isScattered,
  onSourceIdsChange,
  containerRef,
}: DesktopBoardProps) {
  const [orderedSourceIds, setOrderedSourceIds] = useState(sourceIds)
  const initialOrderedSourceIdsRef = useRef(sourceIds)
  const [scatterVectors, setScatterVectors] = useState<Record<string, ScatterVector>>({})
  const [visibleScatterSourceIds, setVisibleScatterSourceIds] = useState<string[]>([])
  const hasScatteredRef = useRef(false)
  if (isScattered) {
    hasScatteredRef.current = true
  }
  const hasScattered = hasScatteredRef.current
  const items = useMemo(() => new Map<string, HTMLLIElement>(), [])
  const visibleSourceIds = useMemo(
    () => orderedSourceIds.filter(id => Boolean(sourcesMap[id])),
    [orderedSourceIds, sourcesMap],
  )

  useEffect(() => {
    setOrderedSourceIds(sourceIds)
  }, [sourceIds])

  const onDragStart = useCallback(() => {
    initialOrderedSourceIdsRef.current = orderedSourceIds
  }, [orderedSourceIds])

  const onDropTargetChange = useCallback(({ location, source }: BaseEventPayload<ElementDragType>) => {
    const target = location.current.dropTargets[0]
    if (!target?.data || !source?.data) return

    const fromId = source.data.id as string
    const toId = target.data.id as string

    const fromIndex = orderedSourceIds.indexOf(fromId)
    const toIndex = orderedSourceIds.indexOf(toId)

    if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return

    const newSourceIds = [...orderedSourceIds]
    const [movedItem] = newSourceIds.splice(fromIndex, 1)
    newSourceIds.splice(toIndex, 0, movedItem)

    setOrderedSourceIds(newSourceIds)
  }, [orderedSourceIds])

  const onDrop = useCallback(({ location }: BaseEventPayload<ElementDragType>) => {
    // If dropped outside (no targets), revert
    if (location.current.dropTargets.length === 0) {
      setOrderedSourceIds(initialOrderedSourceIdsRef.current)
      return
    }
    onSourceIdsChange?.(orderedSourceIds)
  }, [orderedSourceIds, onSourceIdsChange])

  // avoid animation jitter
  const { run } = useThrottleFn(onDropTargetChange, ANIMATION_DURATION * 1000, {
    edges: ["trailing", "leading"],
  })

  // Calculate scatter vectors only while the board is scattering away.
  useLayoutEffect(() => {
    if (!isScattered) {
      return
    }

    const getVisibleBounds = (container: HTMLDivElement) => {
      const containerRect = container.getBoundingClientRect()
      const top = Math.max(containerRect.top, 0)
      const right = Math.min(containerRect.right, window.innerWidth)
      const bottom = Math.min(containerRect.bottom, window.innerHeight)
      const left = Math.max(containerRect.left, 0)

      return {
        visibleRect: {
          top,
          right,
          bottom,
          left,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        },
      }
    }

    const isRectVisible = (
      rect: DOMRect,
      bounds: VisibleBounds,
    ) => (
      rect.bottom > bounds.top
      && rect.top < bounds.bottom
      && rect.right > bounds.left
      && rect.left < bounds.right
    )

    const calculateVectors = (): void => {
      const container = containerRef?.current
      if (!container) return

      const newVectors: Record<string, ScatterVector> = {}
      const newVisibleSourceIds: string[] = []
      const { visibleRect } = getVisibleBounds(container)
      const centerX = visibleRect.left + visibleRect.width / 2
      const centerY = visibleRect.top + visibleRect.height / 2

      items.forEach((el, id) => {
        if (!visibleSourceIds.includes(id)) return // cleanup old refs

        const rect = el.getBoundingClientRect()
        if (!isRectVisible(rect, visibleRect)) return

        newVisibleSourceIds.push(id)
        const elCenterX = rect.left + rect.width / 2
        const elCenterY = rect.top + rect.height / 2

        let dx = elCenterX - centerX
        let dy = elCenterY - centerY

        // Handle exact center case
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          dx = (Math.random() - 0.5) || 1
          dy = (Math.random() - 0.5) || 1
        }

        // Normalize and scale to ensure it goes off the board layer.
        const length = Math.sqrt(dx * dx + dy * dy) || 1
        const maxDist = Math.sqrt(visibleRect.width ** 2 + visibleRect.height ** 2)
        const scale = maxDist / 2 + 200 // Add some buffer

        newVectors[id] = {
          x: (dx / length) * scale,
          y: (dy / length) * scale,
        }
      })
      setScatterVectors(newVectors)
      setVisibleScatterSourceIds(newVisibleSourceIds)
    }

    calculateVectors()
    window.addEventListener("scroll", calculateVectors, true)
    window.addEventListener("resize", calculateVectors)

    const container = containerRef?.current
    const resizeObserver = container
      ? new ResizeObserver(() => {
          calculateVectors()
        })
      : null

    if (container && resizeObserver) {
      resizeObserver.observe(container)
    }

    return () => {
      window.removeEventListener("scroll", calculateVectors, true)
      window.removeEventListener("resize", calculateVectors)
      resizeObserver?.disconnect()
    }
  }, [containerRef, visibleSourceIds, isScattered, items])

  const boardContent = (
    <m.ol
      className={className || "flex flex-wrap justify-center gap-2 sm:gap-6"}
      initial="hidden"
      animate={isScattered ? "scattered" : "visible"}
      variants={{
        hidden: {
          opacity: 0,
        },
        visible: {
          opacity: 1,
        },
        scattered: {
          transition: {
            duration: 0,
          },
        },
      }}
    >
      {visibleSourceIds.map((id, index) => (
        <m.li
          key={id}
          ref={(el) => {
            if (el) items.set(id, el)
            else items.delete(id)
          }}
          layout={!isScattered} // Disable layout animation during scatter to prevent conflict
          custom={{
            index,
            scatterIndex: visibleScatterSourceIds.indexOf(id),
            hasScattered,
            vector: scatterVectors[id],
          }}
          transition={{
            type: "tween",
            duration: ANIMATION_DURATION,
          }}
          variants={{
            hidden: {
              y: 20,
              opacity: 0,
            },
            visible: ({ hasScattered, index, scatterIndex }: ScatterItemCustom) => {
              const isVisibleScatterCard = scatterIndex !== -1
              return {
                y: 0,
                x: 0,
                scale: 1,
                opacity: 1,
                transition: hasScattered && !isVisibleScatterCard
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      delay: (hasScattered ? scatterIndex : index) * SCATTER_STAGGER,
                    },
              }
            },
            scattered: ({ scatterIndex, vector }: ScatterItemCustom) => {
              if (scatterIndex === -1 || !vector) {
                return {
                  opacity: 0,
                  transition: {
                    duration: 0,
                  },
                }
              }
              return {
                x: vector.x,
                y: vector.y,
                scale: 1.1,
                opacity: 0,
                transition: {
                  delay: scatterIndex * SCATTER_STAGGER,
                  duration: 0.4,
                  ease: "easeIn",
                },
              }
            },
          }}
        >
          {isSortable
            ? <DraggableCard id={id} source={sourcesMap[id]} />
            : <Card id={id} source={sourcesMap[id]} />}
        </m.li>
      ))}
    </m.ol>
  )

  if (!isSortable) {
    return boardContent
  }

  return (
    <DndContext onDragStart={onDragStart} onDropTargetChange={run} onDrop={onDrop}>
      {boardContent}
    </DndContext>
  )
}
