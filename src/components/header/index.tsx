import type { RefObject } from "react"
import { PhArrowCounterClockwiseDuotone } from "../icons/ph"
import { DateTime } from "./date-time"
import { Logo } from "./logo"
import Nav from "./nav"

interface HeaderProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

export function Header({ scrollContainerRef }: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-20 p-4 pointer-events-none">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hidden pointer-events-auto md:pointer-events-none">
        {/* Left Section - Tabs */}
        <div className="shrink-0 flex-1 flex justify-end">
          <Nav />
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
