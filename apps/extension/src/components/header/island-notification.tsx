import type { HeaderNotification } from "./notification"
import { PhInfo, PhWarningCircle } from "../icons/ph"

interface IslandNotificationProps {
  notification: HeaderNotification
}

export function IslandNotification({
  notification,
}: IslandNotificationProps): React.JSX.Element {
  const isError = notification.tone === "error"
  const NotificationIcon = isError ? PhWarningCircle : PhInfo

  return (
    <section
      role={isError ? "alert" : "status"}
      className="grid size-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 text-left"
      onClick={event => event.stopPropagation()}
    >
      <NotificationIcon
        className={isError ? "size-5 text-destructive" : "size-5 text-theme-400"}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{notification.title}</h2>
        <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">
          {notification.description}
        </p>
      </div>
    </section>
  )
}
