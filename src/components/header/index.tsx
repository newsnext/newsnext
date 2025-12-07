import type { RefObject } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { PhArrowCounterClockwiseDuotone } from "../icons/ph"
import { Logo } from "./logo"

const TABS = ["All", "Tech", "Social", "News"] as const

function DateTime() {
  const [date, setDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="island-pill px-4 h-10 flex items-center gap-3 select-none">
      <span className="text-lg font-bold tabular-nums text-white/90 tracking-tight">
        {format(date, "HH:mm")}
      </span>
      <div className="flex-col-center text-[10px] font-semibold leading-tight text-white/50 border-l border-white/10 pl-3">
        <span>{format(date, "EEE", { locale: enUS })}</span>
        <span>{format(date, "MM/dd")}</span>
      </div>
    </div>
  )
}

interface HeaderProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

export function Header({ scrollContainerRef }: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-20 p-4 pointer-events-none">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hidden pointer-events-auto md:pointer-events-none">
        {/* Left Section - Tabs */}
        <div className="shrink-0 flex-1 flex justify-end">
          <div className="island-pill flex gap-2 items-center px-2 h-10 pointer-events-auto">
            {TABS.map((tab, index) => (
              <button
                key={tab}
                className={cn(
                  `px-2 py-0.5 rounded-full text-sm font-medium transition-all whitespace-nowrap`,
                  index === 0
                    ? "bg-theme-400 text-white shadow-md"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Center Section - Logo */}
        <Logo scrollContainerRef={scrollContainerRef} />

        {/* Right Section - DateTime, Refresh, User */}
        <div className="shrink-0 flex items-center gap-3 flex-1 justify-start">
          <DateTime />
          {/* Refresh Button - Right Island 1 */}
          <button
            className="island-pill flex items-center justify-center h-10 w-10 text-white/70 hover:text-white hover:bg-black/30 pointer-events-auto"
            title="Refresh All"
          >
            <PhArrowCounterClockwiseDuotone className="size-5" />
          </button>

          {/* User Avatar - Right Island 2 */}
          <button
            className="island-pill size-10 bg-linear-to-br from-theme-400 to-theme-600 hover:from-theme-500 hover:to-theme-700 flex items-center justify-center text-white font-semibold text-base pointer-events-auto"
            title="User Profile"
          >
            U
          </button>
        </div>
      </div>
    </header>
  )
}
