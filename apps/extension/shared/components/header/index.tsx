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
    <header className="sticky top-0 inset-x-0 z-50 shrink-0 py-6 pointer-events-none">
      <div className="grid h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 W">
        {/* Left Section - Tabs */}
        <div className="flex min-w-0 items-center justify-end gap-2 W">
          <Nav className="max-md:hidden" />
          <SearchDialog />
        </div>

        {/* Center Section - Title Island */}
        <TitleIsland width={150} scrollContainerRef={scrollContainerRef} />

        {/* Right Section - DateTime, Refresh, User */}
        <div className="flex min-w-0 items-center justify-start gap-2 W">
          <RefreshButton />
          <DateTime className="max-md:hidden" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
