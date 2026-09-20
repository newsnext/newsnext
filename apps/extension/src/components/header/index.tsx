import type { HeaderNotification } from "./notification"
import { Button } from "@newsnext/ui/components/button"
import { useIsFetching } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { useCallback, useState } from "react"
import { useI18n } from "@/hooks/use-i18n"
import { getWidgetManualRequestGroup, LIVE_WIDGET_QUERY_KEY, useIsManualRequestingGroup, useManualRequestLiveCards, useManualRequestWidgets } from "@/hooks/use-manual-request"
import { currentBoardAtom } from "@/store/board"
import { PhArrowCounterClockwise, PhCircleDashed } from "../icons/ph"
import { SearchDialog } from "../search"
import { BoardNav } from "./board-nav"
import { DateTime } from "./date-time"
import { TitleIsland } from "./title-island"
import { UserMenu } from "./user-menu"

function ManualRequestButton() {
  const { t } = useI18n()
  const board = useAtomValue(currentBoardAtom)
  const requestLiveCards = useManualRequestLiveCards(board?.nowLayer.liveCards ?? [])
  const requestWidgets = useManualRequestWidgets(board?.id)
  const liveCardGroup = `live-cards:${[...(board?.nowLayer.liveCards ?? [])].sort().join(",")}`
  const widgetGroup = getWidgetManualRequestGroup(board?.id ?? "")
  const isLiveCardManuallyRequesting = useIsManualRequestingGroup(liveCardGroup)
  const isWidgetManuallyRequesting = useIsManualRequestingGroup(widgetGroup)
  const isLiveCardFetching = useIsFetching({
    predicate: query => query.queryKey[0] === "card"
      && (board?.nowLayer.liveCards ?? []).includes(query.queryKey[1] as string),
  }) > 0
  const isWidgetFetching = useIsFetching({
    predicate: query => query.queryKey[0] === LIVE_WIDGET_QUERY_KEY[0]
      && query.queryKey[1] === board?.id,
  }) > 0
  const isFetching = board?.layer === "next"
    ? isWidgetFetching || isWidgetManuallyRequesting
    : isLiveCardFetching || isLiveCardManuallyRequesting
  const manualRequest = useCallback(async () => {
    if (!board) return
    if (board.layer === "next") {
      await requestWidgets()
    } else {
      await requestLiveCards()
    }
  }, [board, requestLiveCards, requestWidgets])
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="island-pill"
      aria-label={t("manualRequest")}
      title={t("manualRequest")}
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
    // Click-through shell: the full-width sticky bar must not block page gestures; interactive islands re-enable pointer events themselves.
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
