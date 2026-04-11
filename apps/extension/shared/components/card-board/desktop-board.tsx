import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import type { RefObject } from "react"
import type { BoardFeed } from "@/typings/feed"
import { useThrottleFn } from "@newsnext/ui/hooks/use-throttle-fn"
import { motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { DndContext } from "@/hooks/use-dnd-context"
import { DraggableCard } from "../card/draggable-card"

const ANIMATION_DURATION = 0.2 // 200ms

interface DesktopBoardProps {
  feedIds: string[]
  feedsMap: Record<string, BoardFeed>
  className?: string
  isScattered?: boolean
  onFeedIdsChange?: (feedIds: string[]) => void
  containerRef?: RefObject<HTMLDivElement | null>
}

export function DesktopBoard({
  feedIds,
  feedsMap,
  className,
  isScattered,
  onFeedIdsChange,
  containerRef,
}: DesktopBoardProps) {
  const [orderedFeedIds, setOrderedFeedIds] = useState(feedIds)
  const initialOrderedFeedIdsRef = useRef(feedIds)
  const [scatterVectors, setScatterVectors] = useState<Record<string, { x: number, y: number }>>({})
  const itemsRef = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    setOrderedFeedIds(feedIds)
  }, [feedIds])

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

  // Calculate scatter vectors
  useEffect(() => {
    const calculateVectors = () => {
      const container = containerRef?.current
      if (!container) return

      const newVectors: Record<string, { x: number, y: number }> = {}
      const containerRect = container.getBoundingClientRect()
      const centerX = containerRect.left + containerRect.width / 2
      const centerY = containerRect.top + containerRect.height / 2

      itemsRef.current.forEach((el, id) => {
        if (!orderedFeedIds.includes(id)) return // cleanup old refs

        const rect = el.getBoundingClientRect()
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
        const maxDist = Math.sqrt(containerRect.width ** 2 + containerRect.height ** 2)
        const scale = maxDist / 2 + 200 // Add some buffer

        newVectors[id] = {
          x: (dx / length) * scale,
          y: (dy / length) * scale,
        }
      })
      setScatterVectors(newVectors)
    }

    calculateVectors()
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
      window.removeEventListener("resize", calculateVectors)
      resizeObserver?.disconnect()
    }
  }, [containerRef, orderedFeedIds])

  return (
    <DndContext onDragStart={onDragStart} onDropTargetChange={run} onDrop={onDrop}>
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
            transition: {
              delayChildren: 0.1,
              staggerChildren: 0.1,
            },
          },
          scattered: {
            transition: {
              staggerChildren: 0.01, // Faster stagger for scatter
            },
          },
        }}
      >
        {orderedFeedIds.map((id, index) => (
          <motion.li
            key={id}
            ref={(el) => {
              if (el) itemsRef.current.set(id, el)
              else itemsRef.current.delete(id)
            }}
            layout={!isScattered} // Disable layout animation during scatter to prevent conflict
            custom={{ index, vector: scatterVectors[id] }}
            transition={{
              type: "tween",
              duration: ANIMATION_DURATION,
            }}
            variants={{
              hidden: {
                y: 20,
                opacity: 0,
              },
              visible: {
                y: 0,
                x: 0,
                scale: 1,
                opacity: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                },
              },
              scattered: ({ vector }: { vector?: { x: number, y: number } }) => {
                if (!vector) {
                  // Fallback if vector not ready
                  return { opacity: 0 }
                }
                return {
                  x: vector.x,
                  y: vector.y,
                  scale: 1.1,
                  opacity: 0,
                  transition: {
                    duration: 0.4,
                    ease: "easeIn",
                  },
                }
              },
            }}
          >
            <DraggableCard id={id} feed={feedsMap[id]} />
          </motion.li>
        ))}
      </motion.ol>
    </DndContext>
  )
}
