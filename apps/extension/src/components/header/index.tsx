import type { RefObject } from "react"
import { Button } from "@newsnext/ui/components/button"
import { useFetchLatest } from "@/hooks"
import { PhArrowCounterClockwiseDuotone, PhCircleDashedDuotone } from "../icons/ph"
import { SearchDialog } from "../search"
import { BoardNav } from "./board-nav"
import { DateTime } from "./date-time"
import { TitleIsland } from "./title"
import { UserMenu } from "./user-menu"

interface HeaderProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

function FetchLatestButton() {
  const { fetchLatest, isFetching } = useFetchLatest()
  return (
    <Button
      type="button"
      variant="island"
      size="icon-lg"
      title="Fetch Latest for Active Cards"
      onClick={fetchLatest}
    >
      {isFetching ? <PhCircleDashedDuotone className="size-5 animate-spin" /> : <PhArrowCounterClockwiseDuotone className="size-5" />}
    </Button>
  )
}

export function Header({ scrollContainerRef }: HeaderProps) {
  return (
    <header className="sticky top-0 inset-x-0 z-50 shrink-0 py-6 pointer-events-none">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-[2.75rem_auto] md:h-11 md:grid-rows-1 items-center gap-2 W">
        {/* Left Section */}
        <div className="col-span-3 row-start-2 flex min-w-0 items-center justify-center gap-2 md:col-span-1 md:col-start-1 md:row-start-1 md:justify-end W">
          <BoardNav />
          <SearchDialog />
        </div>

        {/* Center Section - Title Island */}
        <div className="col-start-2 row-start-1">
          <TitleIsland width={150} scrollContainerRef={scrollContainerRef} />
        </div>

        {/* Right Section - DateTime, Fetch Latest, User */}
        <div className="col-start-3 row-start-1 flex min-w-0 items-center justify-start gap-2 W">
          <FetchLatestButton />
          <DateTime className="max-md:hidden" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
