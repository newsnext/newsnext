import type { ReactNode } from "react"
import { motion } from "motion/react"
import Card from "../card"

export const ANIMATION_DURATION = 0.3 // 300ms

export interface BoardProps {
  sourceIds: string[]
  className?: string
  renderCard?: (id: string) => ReactNode
}

export function Board({ sourceIds, className, renderCard }: BoardProps) {
  return (
    <motion.ol
      className={className || "flex flex-wrap justify-center gap-2 sm:gap-6"}
      initial="hidden"
      animate="visible"
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
      }}
    >
      {sourceIds.map(id => (
        <motion.li
          key={id}
          layout
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
              opacity: 1,
            },
          }}
        >
          {renderCard ? renderCard(id) : <Card id={id} />}
        </motion.li>
      ))}
    </motion.ol>
  )
}

export default Board
