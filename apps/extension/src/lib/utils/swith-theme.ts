import type { Color } from "@newsnext/shared/types"
import { isThemeColor } from "../settings/theme-color"

export const THEME_COLOR_KEY = "newsnext-theme-color"
export const THEME_MODE_KEY = "newsnext-theme-mode"
export type ThemeMode = "light" | "dark" | "system"

let syncedFaviconColor: Color | null = null
let requestedFaviconColor: Color | null = null
let faviconSvgSourcePromise: Promise<string> | null = null
const themedFaviconUrls = new Map<Color, string>()

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
  void syncThemeFavicon(color)
}

function loadFaviconSvgSource(): Promise<string> {
  faviconSvgSourcePromise ??= fetch("/icon/icon.svg").then(async (response) => {
    if (!response.ok) throw new Error(`Failed to load theme icon: ${response.status}`)
    return response.text()
  }).catch((error: unknown) => {
    faviconSvgSourcePromise = null
    throw error
  })
  return faviconSvgSourcePromise
}

function createThemedFaviconUrl(source: string, color: string): string {
  const document = new DOMParser().parseFromString(source, "image/svg+xml")
  const svg = document.documentElement
  svg.setAttribute("color", color)
  return `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
}

export async function syncThemeFavicon(color: string): Promise<void> {
  if (!isThemeColor(color) || syncedFaviconColor === color || requestedFaviconColor === color) return

  const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
  if (!link) return

  requestedFaviconColor = color
  const themeColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-theme-500")
    .trim()

  try {
    let faviconUrl = themedFaviconUrls.get(color)
    if (!faviconUrl) {
      const source = await loadFaviconSvgSource()
      faviconUrl = createThemedFaviconUrl(source, themeColor || "oklch(63.7% 0.237 25.331)")
      themedFaviconUrls.set(color, faviconUrl)
    }
    if (requestedFaviconColor !== color) return

    link.type = "image/svg+xml"
    link.href = faviconUrl
  } catch {
    if (requestedFaviconColor === color) requestedFaviconColor = null
    return
  }

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
