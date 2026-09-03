import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { RefObject } from "react"
import type { HeaderNotification } from "../notification"
import type { TitleIslandFeature } from "./feature"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { useSetAtom } from "jotai"
import { m, useReducedMotion } from "motion/react"
import { useEffect, useEffectEvent, useState } from "react"
import { useI18n } from "@/hooks/use-i18n"
import { isSortableData } from "@/lib/board"
import { deleteInstanceAtom } from "@/store/board"
import { PhTrash } from "../../icons/ph"
import { IslandNotification } from "../island-notification"
import {
  HEADER_NOTIFICATION_DURATION,
  HEADER_NOTIFICATION_HEIGHT,
  HEADER_NOTIFICATION_WIDTH,
} from "../notification"
import { TITLE_ISLAND_FEATURE_PRIORITY } from "./feature"
import { ThemeFeature } from "./theme"

export function useThemeFeature(): {
  feature: TitleIslandFeature | null
  open: () => void
} {
  const [isOpen, setIsOpen] = useState(false)

  return {
    feature: isOpen
      ? {
          blockOutsideInteraction: true,
          content: <ThemeFeature />,
          height: 110,
          id: "board-theme",
          onDismiss: () => setIsOpen(false),
          priority: TITLE_ISLAND_FEATURE_PRIORITY.panel,
          width: 270,
        }
      : null,
    open: () => setIsOpen(true),
  }
}

export function useNotificationFeature(
  notification: HeaderNotification | null,
  onDismiss: () => void,
): TitleIslandFeature | null {
  useEffect(() => {
    if (!notification) return

    const timeout = window.setTimeout(onDismiss, HEADER_NOTIFICATION_DURATION)
    return () => window.clearTimeout(timeout)
  }, [notification, onDismiss])

  if (!notification) return null

  return {
    content: <IslandNotification notification={notification} />,
    height: HEADER_NOTIFICATION_HEIGHT,
    id: "notification",
    onDismiss,
    priority: TITLE_ISLAND_FEATURE_PRIORITY.notification,
    width: HEADER_NOTIFICATION_WIDTH,
  }
}

export function useTrashFeature(
  surfaceRef: RefObject<HTMLDivElement | null>,
): TitleIslandFeature | null {
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [isOverTrash, setIsOverTrash] = useState(false)
  const deleteInstance = useSetAtom(deleteInstanceAtom)
  const shouldReduceMotion = useReducedMotion()

  const deleteDraggedLiveCards = useEffectEvent(async ({ source }: ElementEventBasePayload) => {
    if (!isSortableData(source.data)) return

    try {
      for (const instanceId of source.data.ids) {
        await deleteInstance(instanceId)
      }
    } catch (error) {
      console.error("Failed to delete dropped LiveCards", error)
    }
  })

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return

    return combine(
      monitorForElements({
        canMonitor: ({ source }) => isSortableData(source.data),
        onDragStart: () => setIsDragging(true),
        onDrag: ({ location }) => {
          const { clientX, clientY } = location.current.input
          const rect = surface.getBoundingClientRect()
          setIsOverTrash(
            clientX >= rect.left
            && clientX <= rect.right
            && clientY >= rect.top
            && clientY <= rect.bottom,
          )
        },
        onDrop: (args) => {
          const { clientX, clientY } = args.location.current.input
          const rect = surface.getBoundingClientRect()
          const shouldDelete = clientX >= rect.left
            && clientX <= rect.right
            && clientY >= rect.top
            && clientY <= rect.bottom
          setIsDragging(false)
          setIsOverTrash(false)
          if (shouldDelete) void deleteDraggedLiveCards(args)
        },
      }),
      dropTargetForElements({
        element: surface,
        canDrop: ({ source }) => isSortableData(source.data),
        getDropEffect: () => "move",
      }),
    )
  }, [surfaceRef])

  if (!isDragging) return null

  return {
    content: (
      <div
        className="flex size-full items-center justify-center gap-2.5 text-red-600 dark:text-red-400"
        aria-label={isOverTrash ? t("releaseToDeleteLiveCard") : t("deleteLiveCard")}
      >
        <m.div
          animate={isOverTrash && !shouldReduceMotion
            ? { rotate: [-5, 5, 0], scale: 1.12 }
            : { rotate: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <PhTrash className="size-7" />
        </m.div>
        <span className="text-sm font-semibold">
          {isOverTrash ? t("releaseToDelete") : t("dropToDelete")}
        </span>
      </div>
    ),
    height: 72,
    id: "live-card-trash",
    priority: TITLE_ISLAND_FEATURE_PRIORITY.interaction,
    surfaceClassName: isOverTrash
      ? "bg-red-500/24! text-red-700! shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--color-red-500)_60%,transparent)] dark:text-red-300!"
      : "bg-red-500/14! text-red-700! dark:text-red-300!",
    width: 190,
  }
}
