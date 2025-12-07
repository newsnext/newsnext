import type { RefObject } from "react"
import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import { motion, useScroll, useTransform } from "motion/react"
import { useEffect, useState } from "react"
import { PhArrowCounterClockwiseDuotone } from "../icons/ph"

const TABS = ["All", "Tech", "Social", "News"] as const

function DateTime() {
  const [date, setDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="island-pill px-3 h-10 flex flex-col justify-center items-center text-xs font-medium text-white/90 leading-none">
      <span className="text-sm font-bold">{format(date, "HH:mm")}</span>
      <span className="text-[10px] text-white/60 font-medium">{format(date, "MM/dd")}</span>
    </div>
  )
}

interface HeaderProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

export function Header({ scrollContainerRef }: HeaderProps) {
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
  })
  const opacity = useTransform(scrollYProgress, [0, 0.1], [0, 1])

  return (
    <header className="fixed top-0 inset-x-0 z-20 p-4 flex items-center pointer-events-none">
      <div className="flex-1 flex justify-end pr-3">
        <div className="island-pill flex gap-2 items-center px-2 h-10">
          {TABS.map((tab, index) => (
            <button
              key={tab}
              className={`px-2 py-0.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                index === 0
                  ? "bg-theme-400 text-white shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <Link
        to="/"
        className="island-pill relative flex gap-2 items-center px-4 h-10 hover:bg-black/30 shrink-0"
      >
        <svg className="absolute inset-0 size-full pointer-events-none">
          <motion.rect
            x="1"
            y="1"
            style={{
              width: "calc(100% - 2px)",
              height: "calc(100% - 2px)",
              pathLength: scrollYProgress,
              opacity,
            }}
            rx="19"
            ry="19"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            className="text-theme-400"
          />
        </svg>
        <div className="size-5 bg-cover shrink-0" title="logo" style={{ backgroundImage: "url(/icon.svg)" }} />
        <span className="text-xl font-brand font-bold whitespace-nowrap">
          News
          <span className="text-theme-400">N</span>
          ext
        </span>
      </Link>

      <div className="flex-1 flex justify-start pl-3 gap-3">
        <DateTime />
        {/* Refresh Button - Right Island 1 */}
        <button
          className="island-pill flex items-center justify-center h-10 w-10 text-white/70 hover:text-white hover:bg-black/30"
          title="Refresh All"
        >
          <PhArrowCounterClockwiseDuotone className="size-5" />
        </button>

        {/* User Avatar - Right Island 2 */}
        <button
          className="island-pill size-10 bg-linear-to-br from-theme-400 to-theme-600 hover:from-theme-500 hover:to-theme-700 flex items-center justify-center text-white font-semibold text-base"
          title="User Profile"
        >
          U
        </button>

      </div>
    </header>
  )
}
