import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { NEXT_LAYER_SCROLL_RESTORATION_ID } from "@/lib/scroll-restoration"
import { WidgetContainer } from "./widget-container"

export function NextLayer() {
  const { setNextLayerScrollContainer } = useScrollProgressContext()

  return (
    <div
      ref={setNextLayerScrollContainer}
      data-scroll-restoration-id={NEXT_LAYER_SCROLL_RESTORATION_ID}
      className="h-full w-full overflow-y-auto bg-transparent scrollbar-hidden"
    >
      <WidgetContainer>
        <div
          aria-hidden="true"
          className="h-[120vh] rounded-3xl bg-background/45 shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm"
        />
      </WidgetContainer>
    </div>
  )
}
