export const HEADER_NOTIFICATION_DURATION = 8000
export const HEADER_NOTIFICATION_HEIGHT = 80
export const HEADER_NOTIFICATION_WIDTH = 340

export interface HeaderNotification {
  description: string
  title: string
  tone: "default" | "error"
}
