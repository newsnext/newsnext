import type { HeaderNotification } from "../notification"
import type { TitleIslandFeature } from "./feature"
import { DynamicIsland } from "@newsnext/ui/components/dynamic-island"
import { useAtomValue } from "jotai"
import { useRef } from "react"
import { currentBoardAtom } from "@/store/board"
import { useHeaderProgress } from "../use-header-progress"
import { resolveTitleIslandFeature } from "./feature"
import { useNotificationFeature, useThemeFeature, useTrashFeature } from "./features"
import { TitleIslandProgress, TitleIslandProgressGlow } from "./progress"

export interface TitleIslandProps {
  additionalFeatures?: readonly TitleIslandFeature[]
  notification: HeaderNotification | null
  onDismissNotification: () => void
  width?: number
}

export function TitleIsland({
  additionalFeatures = [],
  notification,
  onDismissNotification,
  width = 150,
}: TitleIslandProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const progress = useHeaderProgress()
  const themeColor = useAtomValue(currentBoardAtom)?.color ?? "red"
  const themeFeature = useThemeFeature()
  const notificationFeature = useNotificationFeature(
    notification,
    onDismissNotification,
  )
  const trashFeature = useTrashFeature(surfaceRef)
  const activeFeature = resolveTitleIslandFeature([
    themeFeature.feature,
    notificationFeature,
    trashFeature,
    ...additionalFeatures,
  ])

  return (
    <>
      <div className="h-11 shrink-0" style={{ width: `${width}px` }} />

      <DynamicIsland
        top={26}
        expanded={activeFeature !== null}
        blockOutsideInteraction={activeFeature?.blockOutsideInteraction ?? false}
        wrapperClassName="absolute inset-x-0"
        surfaceRef={surfaceRef}
        className={activeFeature?.surfaceClassName}
        smallClassName="flex items-center gap-2 px-4"
        smallHeight={40}
        smallWidth={width}
        largeWidth={activeFeature?.width ?? width}
        largeHeight={activeFeature?.height ?? 40}
        onChange={(isSmall) => {
          if (isSmall) {
            activeFeature?.onDismiss?.()
          } else {
            themeFeature.open()
          }
        }}
        outerDecoration={isSmall => isSmall
          ? (
              <TitleIslandProgressGlow
                opacity={progress.opacity}
                scrollYProgress={progress.scrollYProgress}
              />
            )
          : null}
      >
        {isSmall => isSmall
          ? <TitleIslandProgress {...progress} themeColor={themeColor} />
          : activeFeature?.content}
      </DynamicIsland>
    </>
  )
}
