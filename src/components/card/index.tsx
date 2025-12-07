import type { ReactNode } from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  PhArrowCounterClockwiseDuotone,
  PhCircleDashedDuotone,
  PhStarDuotone,
  PhStarFill,
} from "../icons/ph"
import { Button } from "../ui/button"
import { Hottest } from "./hottest"
import { MOCK_ITEMS_HOT, MOCK_ITEMS_TIMELINE, MOCK_SOURCES } from "./mock-data"
import { Timeline } from "./timeline"

export interface CardProps {
  id: string
  className?: string
  isDragging?: boolean
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
}

export default function Card({ id, className, nodeRef, dragHandle }: CardProps) {
  const source = MOCK_SOURCES[id] || MOCK_SOURCES["36kr"]
  const [isFocused, setIsFocused] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const items = source.type === "hottest" ? MOCK_ITEMS_HOT : MOCK_ITEMS_TIMELINE

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div
      ref={nodeRef}
      className={cn(
        "flex flex-col rounded-2xl p-4",
        `bg-${source.color}-400/40`,
        "h-[500px] w-[400px]",
        className,
      )}
      style={{
        transformOrigin: "50% 50%",
      }}
    >
      <div className="flex justify-between mb-3 items-center mx-1">
        <div className="flex gap-2.5 items-center ml-1">
          <a
            className="size-8 rounded-full bg-cover"
            target="_blank"
            rel="noreferrer"
            href={source.home}
            title={source.desc}
            style={{
              backgroundImage: `url(/icons/${id}.png)`,
            }}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {source.name}
              </span>
              {source.title && (
                <span className={cn("text-sm px-1 rounded bg-background/50 opacity-80", `text-${source.color}-400`)}>
                  {source.title}
                </span>
              )}
            </div>
            <span className="text-xs opacity-70">
              {isRefreshing ? "Updating..." : "Updated just now"}
            </span>
          </div>
        </div>
        <div className={cn("flex gap-1 items-center shrink-0", `text-${source.color}-400`)}>
          <Button
            variant="icon"
            size="icon"
            asChild
            className={cn(
              isRefreshing && "animate-spin",
            )}
            onClick={handleRefresh}
            aria-label="Refresh"
          >
            {isRefreshing ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
          </Button>
          <Button
            variant="icon"
            size="icon"
            asChild
            onClick={() => setIsFocused(!isFocused)}
            aria-label="Favorite"
          >
            {isFocused ? <PhStarFill /> : <PhStarDuotone />}
          </Button>
          {dragHandle}
        </div>
      </div>

      <div className={cn(
        "flex-1 px-2 min-h-0 rounded-2xl py-2 bg-background/70 overflow-y-auto overflow-opacity-0",
        `sprinkle-${source.color}-400`,
      )}
      >
        {source.type === "hottest"
          ? (
              <Hottest items={items} />
            )
          : (
              <Timeline items={items} />
            )}
      </div>
    </div>
  )
}
