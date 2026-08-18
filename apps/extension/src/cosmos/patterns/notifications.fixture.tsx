/* eslint-disable react-refresh/only-export-components */
import { Button } from "@newsnext/ui/components/button"
import { DynamicIsland } from "@newsnext/ui/components/dynamic-island"
import { useEffect, useState } from "react"
import { IslandNotification } from "@/components/header/island-notification"
import { HEADER_NOTIFICATION_DURATION, HEADER_NOTIFICATION_HEIGHT, HEADER_NOTIFICATION_WIDTH } from "@/components/header/notification"

const IMPORT_FAILURE_NOTIFICATION = {
  description: "The selected file is not valid OPML.",
  title: "Couldn’t import OPML",
  tone: "error" as const,
}

function DynamicIslandNotificationFixture(): React.JSX.Element {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const timeout = window.setTimeout(setOpen, HEADER_NOTIFICATION_DURATION, false)
    return () => window.clearTimeout(timeout)
  }, [open])

  return (
    <main className="grid min-h-full content-start justify-items-center gap-6 bg-muted/30 p-8 pt-48 text-center">
      <DynamicIsland
        top={84}
        expanded={open}
        blockOutsideInteraction={false}
        smallWidth={150}
        smallHeight={40}
        largeWidth={HEADER_NOTIFICATION_WIDTH}
        largeHeight={HEADER_NOTIFICATION_HEIGHT}
        onChange={(isSmall) => {
          setOpen(!isSmall)
        }}
      >
        {isSmall => isSmall
          ? <div className="grid size-full place-items-center text-xs">NewsNext</div>
          : <IslandNotification notification={IMPORT_FAILURE_NOTIFICATION} />}
      </DynamicIsland>
      <div className="grid justify-items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
        >
          Show notification
        </Button>
        <p className="text-sm text-muted-foreground">
          The notification expands automatically and restores the collapsed island after eight seconds.
        </p>
      </div>
    </main>
  )
}

export default {
  "Import failure": DynamicIslandNotificationFixture,
}
