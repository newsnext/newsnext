import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { m } from "motion/react"
import { NEXT_LAYER_SCROLL_RESTORATION_ID } from "@/lib/scroll-restoration"
import { DemoGrid } from "./demo-grid"

export function NextLayer() {
  const { setNextLayerScrollContainer } = useScrollProgressContext()

  return (
    <div
      ref={setNextLayerScrollContainer}
      data-scroll-restoration-id={NEXT_LAYER_SCROLL_RESTORATION_ID}
      className="h-full w-full overflow-y-auto bg-transparent scrollbar-hidden"
    >
      <m.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.25, ease: "easeOut" }}
        className="mx-auto min-h-full w-full max-w-7xl px-1 pb-24 pt-28 sm:px-6 lg:px-8"
      >
        <h1 className="sr-only">Next Layer</h1>
        <DemoGrid />
      </m.main>
    </div>
  )
}
