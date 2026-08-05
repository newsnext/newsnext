import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"
import FAVICON_SVG from "/icon.svg?url&raw"

export const THEME_COLOR_KEY = "newsnext-theme-color"
export type ThemeMode = "light" | "dark" | "system"

let syncedFaviconColor: Color | null = null

export function isThemeColor(value: string): value is Color {
  return COLORS.includes(value as Color)
}

export function handleThemeSwitch(color: string): void {
  const root = document.documentElement
  if (!isThemeColor(color)) return
  Array.from(root.classList).forEach((className) => {
    if (className !== color && isThemeColor(className)) root.classList.remove(className)
  })
  if (!root.classList.contains(color)) root.classList.add(color)
  if (localStorage.getItem(THEME_COLOR_KEY) !== color) {
    localStorage.setItem(THEME_COLOR_KEY, color)
  }
  syncThemeFavicon(color)
}

export function syncThemeFavicon(color: string): void {
  if (!isThemeColor(color) || syncedFaviconColor === color) return

  const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
  if (!link) return

  const root = document.documentElement
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

  link.href = url
  syncedFaviconColor = color
}

const prefersDark = (): boolean => {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
}

export function handleThemeModeSwitch(mode: ThemeMode): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const isDark = mode === "dark" || (mode === "system" && prefersDark())
  root.classList.toggle("dark", isDark)
  root.style.colorScheme = isDark ? "dark" : "light"
}
