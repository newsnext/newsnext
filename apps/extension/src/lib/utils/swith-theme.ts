import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"
import FAVICON_SVG from "/icon.svg?url&raw"

export const THEME_COLOR_KEY = "newsnext-theme-color"
export const THEME_MODE_KEY = "newsnext-theme-mode"
export const APP_BACKGROUND_KEY = "newsnext-app-background"
export type ThemeMode = "light" | "dark" | "system"

const APP_BACKGROUNDS = [
  "ambient",
  "sunrise",
  "horizon",
  "orbit",
  "halo",
  "ribbon",
  "nebula",
  "tide",
] as const
export type AppBackground = typeof APP_BACKGROUNDS[number]

export function isAppBackground(value: string | null): value is AppBackground {
  return value !== null && APP_BACKGROUNDS.includes(value as AppBackground)
}

export function readAppBackground(): AppBackground {
  const storedBackground = localStorage.getItem(APP_BACKGROUND_KEY)
  return isAppBackground(storedBackground) ? storedBackground : "ambient"
}

export function handleAppBackgroundSwitch(background: AppBackground): void {
  document.body.dataset.appBackground = background
  localStorage.setItem(APP_BACKGROUND_KEY, background)
}

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
  localStorage.setItem(THEME_MODE_KEY, mode)
}
