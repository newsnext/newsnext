import type { PanInfo } from "motion/react"
import { motion, useMotionValue, useTransform } from "motion/react"
import { useCallback, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import Card from "../card"

interface MobileBoardProps {
  sourceIds: string[]
  className?: string
  isScattered?: boolean
}

const DRAG_BUFFER = 0
const VELOCITY_THRESHOLD = 500
const GAP = 6
const CARD_WIDTH_PERCENT = 0.92
const CARD_MAX_WIDTH = 450
const SPRING_OPTIONS = { type: "spring", stiffness: 300, damping: 30 } as const

export function MobileBoard({ sourceIds }: MobileBoardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)

  // Calculate item width: min(92vw, 450px)
  const itemWidth = useMemo(
    () => (typeof window !== "undefined"
      ? Math.min(window.innerWidth * CARD_WIDTH_PERCENT, CARD_MAX_WIDTH)
      : 350),
    [],
  )
  const trackItemOffset = useMemo(() => itemWidth + GAP, [itemWidth])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      setCurrentIndex(prev => Math.min(prev + 1, sourceIds.length - 1))
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      setCurrentIndex(prev => Math.max(prev - 1, 0))
    }
  }, [sourceIds.length])

  const dragConstraints = useMemo(
    () => ({
      left: -trackItemOffset * (sourceIds.length - 1),
      right: 0,
    }),
    [trackItemOffset, sourceIds.length],
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
          dragConstraints={dragConstraints}
          style={motionStyle}
          onDragEnd={handleDragEnd}
          animate={animateValue}
          transition={SPRING_OPTIONS}
        >
          {sourceIds.map((id, index) => {
            const range = [
              -(index + 1) * trackItemOffset,
              -index * trackItemOffset,
              -(index - 1) * trackItemOffset,
            ]

            const rotateOutputRange = [-10, 0, 10]
            const yOutputRange = [40, 0, 40]

            const rotate = useTransform(x, range, rotateOutputRange, { clamp: false })
            const y = useTransform(x, range, yOutputRange, { clamp: false })

            return (
              <motion.div
                key={id}
                className="relative shrink-0 origin-bottom"
                style={{
                  width: `min(${CARD_WIDTH_PERCENT * 100}vw, ${CARD_MAX_WIDTH}px)`,
                  height: "65vh",
                  rotate,
                  y,
                }}
              >
                <div className="h-full w-full">
                  <Card id={id} className="h-full w-full" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Indicator dots */}
      <div className="mt-6 flex gap-2">
        {sourceIds.map((_, index) => {
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
