import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"

export function isThemeColor(value: unknown): value is Color {
  return typeof value === "string" && COLORS.includes(value as Color)
}
