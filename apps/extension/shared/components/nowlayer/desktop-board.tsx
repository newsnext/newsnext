import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import type { RefObject } from "react"
import type { BoardFeed } from "@/typings/feed"
import { useThrottleFn } from "@newsnext/ui/hooks/use-throttle-fn"
import { motion } from "motion/react"
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
  feedIds: string[]
  feedsMap: Record<string, BoardFeed>
  isSortable?: boolean
  className?: string
  isScattered?: boolean
  onFeedIdsChange?: (feedIds: string[]) => void
  containerRef?: RefObject<HTMLDivElement | null>
}

export function DesktopBoard({
  feedIds,
  feedsMap,
  isSortable = false,
  className,
  isScattered,
  onFeedIdsChange,
  containerRef,
}: DesktopBoardProps) {
  const [orderedFeedIds, setOrderedFeedIds] = useState(feedIds)
  const initialOrderedFeedIdsRef = useRef(feedIds)
  const [scatterVectors, setScatterVectors] = useState<Record<string, ScatterVector>>({})
  const [visibleScatterFeedIds, setVisibleScatterFeedIds] = useState<string[]>([])
  const [hasScattered, setHasScattered] = useState(false)
  const itemsRef = useRef<Map<string, HTMLLIElement>>(new Map())
  const visibleFeedIds = useMemo(
    () => orderedFeedIds.filter(id => Boolean(feedsMap[id])),
    [orderedFeedIds, feedsMap],
  )

  useEffect(() => {
    setOrderedFeedIds(feedIds)
  }, [feedIds])

  useEffect(() => {
    if (isScattered) {
      setHasScattered(true)
    }
  }, [isScattered])

  const onDragStart = useCallback(() => {
    initialOrderedFeedIdsRef.current = orderedFeedIds
  }, [orderedFeedIds])

  const onDropTargetChange = useCallback(({ location, source }: BaseEventPayload<ElementDragType>) => {
    const target = location.current.dropTargets[0]
    if (!target?.data || !source?.data) return

    const fromId = source.data.id as string
    const toId = target.data.id as string

    const fromIndex = orderedFeedIds.indexOf(fromId)
    const toIndex = orderedFeedIds.indexOf(toId)

    if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return

    const newFeedIds = [...orderedFeedIds]
    const [movedItem] = newFeedIds.splice(fromIndex, 1)
    newFeedIds.splice(toIndex, 0, movedItem)

    setOrderedFeedIds(newFeedIds)
  }, [orderedFeedIds])

  const onDrop = useCallback(({ location }: BaseEventPayload<ElementDragType>) => {
    // If dropped outside (no targets), revert
    if (location.current.dropTargets.length === 0) {
      setOrderedFeedIds(initialOrderedFeedIdsRef.current)
      return
    }
    onFeedIdsChange?.(orderedFeedIds)
  }, [orderedFeedIds, onFeedIdsChange])

  // avoid animation jitter
  const { run } = useThrottleFn(onDropTargetChange, ANIMATION_DURATION * 1000, {
    edges: ["trailing", "leading"],
  })

  // Calculate scatter vectors for cards that are visible in the viewport.
  useLayoutEffect(() => {
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
      const newVisibleFeedIds: string[] = []
      const { visibleRect } = getVisibleBounds(container)
      const centerX = visibleRect.left + visibleRect.width / 2
      const centerY = visibleRect.top + visibleRect.height / 2

      itemsRef.current.forEach((el, id) => {
        if (!visibleFeedIds.includes(id)) return // cleanup old refs

        const rect = el.getBoundingClientRect()
        if (!isRectVisible(rect, visibleRect)) return

        newVisibleFeedIds.push(id)
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
      setVisibleScatterFeedIds(newVisibleFeedIds)
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
  }, [containerRef, visibleFeedIds, isScattered])

  const boardContent = (
    <motion.ol
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
      {visibleFeedIds.map((id, index) => (
        <motion.li
          key={id}
          ref={(el) => {
            if (el) itemsRef.current.set(id, el)
            else itemsRef.current.delete(id)
          }}
          layout={!isScattered} // Disable layout animation during scatter to prevent conflict
          custom={{
            index,
            scatterIndex: visibleScatterFeedIds.indexOf(id),
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
            ? <DraggableCard id={id} feed={feedsMap[id]} />
            : <Card id={id} feed={feedsMap[id]} />}
        </motion.li>
      ))}
    </motion.ol>
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
