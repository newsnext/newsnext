import type { MotionValue, PanInfo } from "motion/react"
import type { PointerEvent } from "react"
import type { BoardSource } from "@/typings/source"
import { motion, useDragControls, useMotionValue, useTransform } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import Card from "../card"

interface MobileBoardProps {
  sourceIds: string[]
  sourcesMap: Record<string, BoardSource>
  className?: string
  isScattered?: boolean
}

const DRAG_BUFFER = 0
const VELOCITY_THRESHOLD = 500
const GAP = 6
const CARD_WIDTH_PERCENT = 0.92
const CARD_MAX_WIDTH = 450
const SPRING_OPTIONS = { type: "spring", stiffness: 300, damping: 30 } as const

interface MobileCardProps {
  id: string
  index: number
  x: MotionValue<number>
  trackItemOffset: number
  source: BoardSource
  onDragHandlePointerDown: (event: PointerEvent<HTMLDivElement>) => void
}

const rotateOutputRange = [-10, 0, 10]
const yOutputRange = [40, 0, 40]

function MobileCard({ id, index, x, trackItemOffset, source, onDragHandlePointerDown }: MobileCardProps) {
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ]

  const rotate = useTransform(x, range, rotateOutputRange, { clamp: false })
  const y = useTransform(x, range, yOutputRange, { clamp: false })

  return (
    <motion.div
      className="relative shrink-0 origin-bottom"
      style={{
        width: `min(${CARD_WIDTH_PERCENT * 100}vw, ${CARD_MAX_WIDTH}px)`,
        height: "500px",
        rotate,
        y,
      }}
    >
      <div
        className="h-full w-full"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onDragHandlePointerDown}
      >
        <Card id={id} source={source} className="h-full w-full" />
      </div>
    </motion.div>
  )
}

export function MobileBoard({ sourceIds, sourcesMap }: MobileBoardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const x = useMotionValue(0)
  const visibleSourceIds = useMemo(() => sourceIds.filter(id => Boolean(sourcesMap[id])), [sourceIds, sourcesMap])

  // Calculate item width: min(92vw, 450px)
  const itemWidth = useMemo(
    () => Math.min(window.innerWidth * CARD_WIDTH_PERCENT, CARD_MAX_WIDTH),
    [],
  )
  const trackItemOffset = useMemo(() => itemWidth + GAP, [itemWidth])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      setCurrentIndex(prev => Math.min(prev + 1, visibleSourceIds.length - 1))
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      setCurrentIndex(prev => Math.max(prev - 1, 0))
    }
  }, [visibleSourceIds.length])

  const handleDragHandlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    dragControls.start(event)
  }, [dragControls])

  useEffect(() => {
    setCurrentIndex(prev => Math.max(0, Math.min(prev, Math.max(visibleSourceIds.length - 1, 0))))
  }, [visibleSourceIds.length])

  const dragConstraints = useMemo(
    () => ({
      left: -trackItemOffset * Math.max(visibleSourceIds.length - 1, 0),
      right: 0,
    }),
    [trackItemOffset, visibleSourceIds.length],
  )

  const motionStyle = useMemo(
    () => ({
      gap: `${GAP}px`,
      x,
      touchAction: "pan-y" as const,
    }),
    [x],
  )

  const animateValue = useMemo(
    () => ({ x: -(currentIndex * trackItemOffset) }),
    [currentIndex, trackItemOffset],
  )

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
    >
      <div
        className="flex items-center"
        style={{ width: `min(${CARD_WIDTH_PERCENT * 100}vw, ${CARD_MAX_WIDTH}px)` }}
      >
        <motion.div
          className="flex"
          drag="x"
          dragControls={dragControls}
          dragConstraints={dragConstraints}
          dragListener={false}
          style={motionStyle}
          onDragEnd={handleDragEnd}
          animate={animateValue}
          transition={SPRING_OPTIONS}
        >
          {visibleSourceIds.map((id, index) => (
            <MobileCard
              key={id}
              id={id}
              index={index}
              x={x}
              trackItemOffset={trackItemOffset}
              source={sourcesMap[id]}
              onDragHandlePointerDown={handleDragHandlePointerDown}
            />
          ))}
        </motion.div>
      </div>

      {/* Indicator dots */}
      <div className="mt-6 flex gap-2">
        {visibleSourceIds.map((_, index) => {
          const isActive = index === currentIndex
          return (
            <motion.div
              key={index}
              className={cn(
                `h-2 w-2 rounded-full cursor-pointer transition-colors duration-150`,
                isActive ? "bg-theme-400" : "bg-white/50",
              )}
              onClick={() => setCurrentIndex(index)}
              animate={{ scale: isActive ? 1.2 : 1 }}
            />
          )
        })}
      </div>
    </div>
  )
}
