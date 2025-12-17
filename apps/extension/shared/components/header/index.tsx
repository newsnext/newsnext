import type { RefObject } from "react"
import { useRefetch } from "@/hooks"
import { PhArrowCounterClockwiseDuotone, PhCircleDashedDuotone } from "../icons/ph"
import { DateTime } from "./date-time"
import Nav from "./nav"
import { TitleIsland } from "./title"

interface HeaderProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

export function Header({ scrollContainerRef }: HeaderProps) {
  const { refetchAll, isFetching } = useRefetch()
  return (
    <header className="fixed -top-0.5 inset-x-0 z-20 p-6 pointer-events-none">
      <div className="h-11 flex items-center gap-3 overflow-x-auto scrollbar-hidden pointer-events-auto md:pointer-events-none">
        {/* Left Section - Tabs */}
        <div className="shrink-0 flex-1 flex justify-end gap-3">
          <Nav />
          <button
            className="island-pill flex items-center justify-center size-10 pointer-events-auto"
            title="Refresh All"
            onClick={refetchAll}
            disabled={isFetching}
          >
            {isFetching ? <PhCircleDashedDuotone className="size-5 animate-spin" /> : <PhArrowCounterClockwiseDuotone className="size-5" />}
          </button>
        </div>

        {/* Center Section - Title Island */}
        <TitleIsland width={150} scrollContainerRef={scrollContainerRef} />

        {/* Right Section - DateTime, Refresh, User */}
        <div className="shrink-0 flex items-center gap-3 flex-1 justify-start">
          <DateTime />

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
