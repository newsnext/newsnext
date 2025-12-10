import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"
import FAVICON_SVG from "/icon.svg?url&raw"

/**
 * --500
 */
export const THEME_COLOR_HEX: Record<Color, string> = {
  red: "#EF4444",
  rose: "#F43F5E",
  pink: "#EC4899",
  fuchsia: "#D946EF",
  purple: "#A855F7",
  violet: "#8B5CF6",
  indigo: "#6366F1",
  blue: "#3B82F6",
  sky: "#0EA5E9",
  cyan: "#06B6D4",
  teal: "#14B8A6",
  emerald: "#10B981",
  green: "#22C55E",
  lime: "#84CC16",
  yellow: "#EAB308",
  amber: "#F59E0B",
  orange: "#F97316",
  slate: "#64748B",
  gray: "#6B7280",
  zinc: "#71717A",
  neutral: "#737373",
  stone: "#78716C",
}

export const THEME_KEY = "newsnext-theme"

export function isThemeColor(value: string): value is Color {
  return COLORS.includes(value as Color)
}

export function handleThemeSwitch(color: string) {
  const root = document.documentElement
  if (!isThemeColor(color)) return
  Array.from(root.classList.values()).reverse().forEach((c) => {
    if (isThemeColor(c)) root.classList.remove(c)
  })
  root.classList.add(color)
  localStorage.setItem(THEME_KEY, color)
  const hex = THEME_COLOR_HEX[color]
  if (!hex) return

  const svg = FAVICON_SVG.replace("#F14D42", hex)
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`

  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
  if (link) {
    link.href = url
  }
}