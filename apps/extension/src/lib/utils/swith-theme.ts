import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"
import FAVICON_SVG from "/icon.svg?url&raw"

export const THEME_COLOR_KEY = "newsnext-theme-color"
export type ThemeMode = "light" | "dark" | "system"

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
  localStorage.setItem(THEME_COLOR_KEY, color)
  const colorValue = getComputedStyle(root)
    .getPropertyValue(`--color-${color}-500`)
    .trim()
  if (!colorValue) return

  const svgDocument = new DOMParser().parseFromString(FAVICON_SVG, "image/svg+xml")
  const themeColorElement = svgDocument.querySelector("[data-theme-color]")
  if (!themeColorElement) return

  themeColorElement.setAttribute("fill", colorValue)
  const svg = new XMLSerializer().serializeToString(svgDocument.documentElement)
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`

  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
  if (link) {
    link.href = url
  }
}

const prefersDark = () => {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
}

export function handleThemeModeSwitch(mode: ThemeMode) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const isDark = mode === "dark" || (mode === "system" && prefersDark())
  root.classList.toggle("dark", isDark)
  root.style.colorScheme = isDark ? "dark" : "light"
}
