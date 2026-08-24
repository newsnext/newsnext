import type { HeaderNotification } from "./notification"
import { Button } from "@newsnext/ui/components/button"
import { useCallback, useState } from "react"
import { useManualRequest } from "@/hooks"
import { PhArrowCounterClockwise, PhCircleDashed } from "../icons/ph"
import { SearchDialog } from "../search"
import { BoardNav } from "./board-nav"
import { DateTime } from "./date-time"
import { TitleIsland } from "./title-island"
import { UserMenu } from "./user-menu"

function ManualRequestButton() {
  const { manualRequest, isFetching } = useManualRequest()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="island-pill"
      aria-label="Manual request for active LiveCards"
      title="Manual request for active LiveCards"
      onClick={manualRequest}
    >
      {isFetching ? <PhCircleDashed className="size-5 animate-spin" /> : <PhArrowCounterClockwise className="size-5" />}
    </Button>
  )
}

export function Header() {
  const [notification, setNotification] = useState<HeaderNotification | null>(null)
  const dismissNotification = useCallback(() => setNotification(null), [])

  return (
    <header className="sticky top-0 inset-x-0 z-50 shrink-0 px-4 py-6 pointer-events-none sm:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-[2.75rem_auto] items-center gap-2 md:h-11 md:grid-rows-1">
        {/* Left Section */}
        <div className="col-span-3 row-start-2 flex min-w-0 items-center justify-center md:col-span-1 md:col-start-1 md:row-start-1 md:justify-end md:pr-12">
          <BoardNav onNotify={setNotification} />
        </div>

        <div className="col-start-1 row-start-1 justify-self-end">
          <SearchDialog />
        </div>

        {/* Center Section - Title Island */}
        <div className="col-start-2 row-start-1">
          <TitleIsland
            width={150}
            notification={notification}
            onDismissNotification={dismissNotification}
          />
        </div>

        {/* Right Section - DateTime, Manual Request, User */}
        <div className="col-start-3 row-start-1 flex min-w-0 items-center justify-start gap-2">
          <ManualRequestButton />
          <DateTime className="max-md:hidden" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
