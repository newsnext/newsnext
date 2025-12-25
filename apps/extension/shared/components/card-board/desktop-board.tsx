import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import type { Source } from "@/typings/source"
import { useThrottleFn } from "@newsnext/ui/hooks/use-throttle-fn"
import { motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { DndContext } from "@/hooks/use-dnd-context"
import { DraggableCard } from "../card/draggable-card"

const ANIMATION_DURATION = 0.2 // 200ms

interface DesktopBoardProps {
  sourceIds: string[]
  sourcesMap: Record<string, Source & { id: string }>
  className?: string
  isScattered?: boolean
  onSourceIdsChange?: (sourceIds: string[]) => void
}

export function DesktopBoard({ sourceIds, sourcesMap, className, isScattered, onSourceIdsChange }: DesktopBoardProps) {
  const [scatterVectors, setScatterVectors] = useState<Record<string, { x: number, y: number }>>({})
  const itemsRef = useRef<Map<string, HTMLLIElement>>(new Map())

  const onDropTargetChange = useCallback(({ location, source }: BaseEventPayload<ElementDragType>) => {
    const target = location.current.dropTargets[0]
    if (!target?.data || !source?.data) return

    const fromId = source.data.id as string
    const toId = target.data.id as string

    const fromIndex = sourceIds.indexOf(fromId)
    const toIndex = sourceIds.indexOf(toId)

    if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return

    const newSourceIds = [...sourceIds]
    const [movedItem] = newSourceIds.splice(fromIndex, 1)
    newSourceIds.splice(toIndex, 0, movedItem)

    onSourceIdsChange?.(newSourceIds)
  }, [sourceIds, onSourceIdsChange])

  // avoid animation jitter
  const { run } = useThrottleFn(onDropTargetChange, ANIMATION_DURATION * 1000, {
    edges: ["trailing", "leading"],
  })

  // Calculate scatter vectors
  useEffect(() => {
    const calculateVectors = () => {
      const newVectors: Record<string, { x: number, y: number }> = {}
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2

      itemsRef.current.forEach((el, id) => {
        if (!sourceIds.includes(id)) return // cleanup old refs

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

        // Normalize and scale to ensure it goes off screen
        // Using a large enough multiplier (e.g. diagonal of screen)
        const length = Math.sqrt(dx * dx + dy * dy) || 1
        const maxDist = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2)
        const scale = maxDist / 2 + 200 // Add some buffer

        newVectors[id] = {
          x: (dx / length) * scale,
          y: (dy / length) * scale,
        }
      })
      setScatterVectors(newVectors)
    }

    // Calculate immediately and on resize
    calculateVectors()
    window.addEventListener("resize", calculateVectors)
    return () => window.removeEventListener("resize", calculateVectors)
  }, [sourceIds])

  return (
    <DndContext onDropTargetChange={run}>
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
        {sourceIds.map((id, index) => (
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
            <DraggableCard id={id} source={sourcesMap[id]} />
          </motion.li>
        ))}
      </motion.ol>
    </DndContext>
  )
}
