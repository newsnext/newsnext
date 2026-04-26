import type { RefObject } from "react"
import { useRefetch } from "@/hooks"
import { PhArrowCounterClockwiseDuotone, PhCircleDashedDuotone } from "../icons/ph"
import { SearchDialog } from "../search"
import { DateTime } from "./date-time"
import Nav from "./nav"
import { TitleIsland } from "./title"
import { UserMenu } from "./user-menu"

interface HeaderProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

function RefreshButton() {
  const { refetchAll, isFetching } = useRefetch()
  return (
    <button
      className="island-pill flex items-center justify-center size-10 pointer-events-auto"
      title="Refresh All"
      onClick={refetchAll}
    >
      {isFetching ? <PhCircleDashedDuotone className="size-5 animate-spin" /> : <PhArrowCounterClockwiseDuotone className="size-5" />}
    </button>
  )
}

export function Header({ scrollContainerRef }: HeaderProps) {
  return (
    <header className="sticky top-0 inset-x-0 z-50 shrink-0 p-6 pointer-events-none">
      <div className="h-11 flex items-center gap-3 overflow-x-auto scrollbar-hidden pointer-events-auto md:pointer-events-none">
        {/* Left Section - Tabs */}
        <div className="shrink-0 flex-1 flex justify-end gap-3">
          <Nav />
          <SearchDialog />
        </div>

        {/* Center Section - Title Island */}
        <TitleIsland width={150} scrollContainerRef={scrollContainerRef} />

        {/* Right Section - DateTime, Refresh, User */}
        <div className="shrink-0 flex items-center gap-3 flex-1 justify-start">
          <RefreshButton />
          <DateTime className="max-sm:hidden" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
