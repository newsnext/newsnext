import type { RefObject } from "react"
import { useCallback, useState } from "react"
import { TimelineWidget } from "./timeline-widget"
import { WidgetContainer } from "./widget-container"

interface NextLayerProps {
  boardId: string
  isVisible: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

export function NextLayer({
  boardId,
  isVisible,
  scrollContainerRef,
}: NextLayerProps) {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const setScrollContainer = useCallback((node: HTMLDivElement | null) => {
    if (scrollContainerRef) {
      scrollContainerRef.current = node
    }
    setScrollElement(current => current === node ? current : node)
  }, [scrollContainerRef])

  return (
    <div
      ref={setScrollContainer}
      className="h-full w-full overflow-y-auto bg-transparent scrollbar-hidden"
    >
      {isVisible && (
        <WidgetContainer>
          <TimelineWidget boardId={boardId} scrollElement={scrollElement} />
        </WidgetContainer>
      )}
    </div>
  )
}
