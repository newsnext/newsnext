import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { RefObject } from "react"
import type { BoardSourceCard } from "@/hooks/use-board-source-cards"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index"
import { m } from "motion/react"
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { DndContext } from "@/hooks/use-dnd-context"
import { isSortableData } from "@/lib/board"
import { reorder } from "@/lib/utils/reorder"
import { DraggableCard } from "../card/draggable-card"

const ANIMATION_DURATION = 0.2 // 200ms
const ENTRANCE_DELAY = 0.1
const ENTRANCE_STAGGER = 0.1
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

interface ScatterAnimationState {
  hasScattered: boolean
  vectors: Record<string, ScatterVector>
  visibleInstanceIds: string[]
}

interface InstanceOrderState {
  instanceIds: string[]
  orderedInstanceIds: string[]
}

interface CardContainerProps {
  instanceIds: string[]
  cardsByInstanceId: Record<string, BoardSourceCard>
  sortable?: boolean
  className?: string
  isScattered?: boolean
  onInstanceIdsChange: (instanceIds: string[]) => void
  containerRef?: RefObject<HTMLDivElement | null>
}

export function CardContainer({
  instanceIds,
  cardsByInstanceId,
  sortable = true,
  className,
  isScattered,
  onInstanceIdsChange,
  containerRef,
}: CardContainerProps) {
  const [instanceOrderState, setInstanceOrderState] = useState<InstanceOrderState>(() => ({
    instanceIds,
    orderedInstanceIds: instanceIds,
  }))
  let orderedInstanceIds = instanceOrderState.orderedInstanceIds
  if (instanceOrderState.instanceIds !== instanceIds) {
    orderedInstanceIds = instanceIds
    setInstanceOrderState({
      instanceIds,
      orderedInstanceIds,
    })
  }
  const orderedInstanceIdsRef = useRef(orderedInstanceIds)
  const initialOrderedInstanceIdsRef = useRef(instanceIds)
  const listRef = useRef<HTMLOListElement>(null)
  const [scatterAnimationState, setScatterAnimationState] = useState<ScatterAnimationState>({
    hasScattered: false,
    vectors: {},
    visibleInstanceIds: [],
  })
  const hasScattered = scatterAnimationState.hasScattered
  const items = useMemo(() => new Map<string, HTMLLIElement>(), [])
  const visibleCards = useMemo(
    () => orderedInstanceIds.flatMap((id) => {
      const card = cardsByInstanceId[id]
      return card ? [{ id, ...card }] : []
    }),
    [orderedInstanceIds, cardsByInstanceId],
  )
  const visibleInstanceIds = useMemo(
    () => visibleCards.map(({ id }) => id),
    [visibleCards],
  )
  const isScatterReady = Boolean(
    isScattered
    && scatterAnimationState.visibleInstanceIds.length > 0,
  )

  useLayoutEffect(() => {
    orderedInstanceIdsRef.current = orderedInstanceIds
  }, [orderedInstanceIds])

  const onDragStart = useCallback(() => {
    initialOrderedInstanceIdsRef.current = orderedInstanceIdsRef.current
  }, [])

  const onDrag = useCallback(({ location, source }: ElementEventBasePayload) => {
    const target = location.current.dropTargets[0]
    if (!target || !isSortableData(source.data) || !isSortableData(target.data)) return

    const fromId = source.data.id
    const toId = target.data.id
    const currentInstanceIds = orderedInstanceIdsRef.current
    const fromIndex = currentInstanceIds.indexOf(fromId)
    const toIndex = currentInstanceIds.indexOf(toId)
    if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return

    const closestEdge = extractClosestEdge(target.data)
    const normalizedEdge = closestEdge === "top" || closestEdge === "left"
      ? "left"
      : "right"
    const destinationIndex = getReorderDestinationIndex({
      startIndex: fromIndex,
      indexOfTarget: toIndex,
      closestEdgeOfTarget: normalizedEdge,
      axis: "horizontal",
    })
    if (fromIndex === destinationIndex) return

    const nextInstanceIds = reorder(currentInstanceIds, fromIndex, destinationIndex)
    orderedInstanceIdsRef.current = nextInstanceIds
    setInstanceOrderState(prev => ({
      ...prev,
      orderedInstanceIds: nextInstanceIds,
    }))
  }, [])

  const onDrop = useCallback(({ location }: ElementEventBasePayload) => {
    const list = listRef.current
    const { clientX, clientY } = location.current.input
    const listRect = list?.getBoundingClientRect()
    const hasDropTarget = location.current.dropTargets.length > 0
    const isInsideList = Boolean(
      listRect
      && clientX >= listRect.left
      && clientX <= listRect.right
      && clientY >= listRect.top
      && clientY <= listRect.bottom,
    )

    if (!hasDropTarget || !isInsideList) {
      const initialInstanceIds = initialOrderedInstanceIdsRef.current
      orderedInstanceIdsRef.current = initialInstanceIds
      setInstanceOrderState(prev => ({
        ...prev,
        orderedInstanceIds: initialInstanceIds,
      }))
      return
    }

    const finalInstanceIds = orderedInstanceIdsRef.current
    const initialInstanceIds = initialOrderedInstanceIdsRef.current
    const hasOrderChanged = finalInstanceIds.length !== initialInstanceIds.length || finalInstanceIds.some(
      (id, index) => initialInstanceIds[index] !== id,
    )
    if (!hasOrderChanged) {
      return
    }

    onInstanceIdsChange(finalInstanceIds)
  }, [onInstanceIdsChange])

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
      const newVisibleInstanceIds: string[] = []
      const { visibleRect } = getVisibleBounds(container)
      const centerX = visibleRect.left + visibleRect.width / 2
      const centerY = visibleRect.top + visibleRect.height / 2

      items.forEach((el, id) => {
        if (!visibleInstanceIds.includes(id)) return // cleanup old refs

        const rect = el.getBoundingClientRect()
        if (!isRectVisible(rect, visibleRect)) return

        newVisibleInstanceIds.push(id)
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
      // This layout measurement must update before paint to avoid a visible position flash.
      // eslint-disable-next-line react/set-state-in-effect
      setScatterAnimationState({
        hasScattered: true,
        vectors: newVectors,
        visibleInstanceIds: newVisibleInstanceIds,
      })
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
  }, [containerRef, visibleInstanceIds, isScattered, items])

  return (
    <DndContext
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDropTargetChange={onDrag}
      onDrop={onDrop}
    >
      <m.ol
        ref={listRef}
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
        {visibleCards.map(({ id, collectionId, descriptor, instanceAtom }, index) => (
          <m.li
            key={id}
            data-card-id={id}
            ref={(el) => {
              if (el) items.set(id, el)
              else items.delete(id)
            }}
            layout={!isScattered} // Disable layout animation during scatter to prevent conflict
            initial="hidden"
            animate={isScatterReady ? "scattered" : "visible"}
            custom={{
              index,
              scatterIndex: scatterAnimationState.visibleInstanceIds.indexOf(id),
              hasScattered,
              vector: scatterAnimationState.vectors[id],
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
                  transition: hasScattered
                    ? isVisibleScatterCard
                      ? {
                          delay: scatterIndex * SCATTER_STAGGER,
                          duration: ANIMATION_DURATION,
                          type: "tween",
                        }
                      : { duration: 0 }
                    : {
                        delay: ENTRANCE_DELAY + index * ENTRANCE_STAGGER,
                        duration: ANIMATION_DURATION,
                        type: "tween",
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
            <DraggableCard
              collectionId={collectionId}
              descriptor={descriptor}
              instanceAtom={instanceAtom}
              sortable={sortable}
            />
          </m.li>
        ))}
      </m.ol>
    </DndContext>
  )
}
