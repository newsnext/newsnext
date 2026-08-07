import {
  DEFAULT_FAVICON_URL_TEMPLATE,
  getFavicon,
} from "@newsnext/shared/utils"

export const SOURCE_ICON_PRESETS = {
  faviconIm: {
    label: "Favicon.im",
    template: DEFAULT_FAVICON_URL_TEMPLATE,
  },
  google: {
    label: "Google",
    template: "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url={origin}&size=128",
  },
  duckDuckGo: {
    label: "DuckDuckGo",
    template: "https://icons.duckduckgo.com/ip3/{hostname}.ico",
  },
  vemetric: {
    label: "Vemetric",
    template: "https://favicon.vemetric.com/{hostname}?size=128&format=webp",
  },
} as const

export type SourceIconSource = keyof typeof SOURCE_ICON_PRESETS | "custom"

export interface SourceIconSettings {
  source: SourceIconSource
  template: string
}

export const DEFAULT_SOURCE_ICON_SETTINGS: SourceIconSettings = {
  source: "faviconIm",
  template: SOURCE_ICON_PRESETS.faviconIm.template,
}

export function resolveSourceIcon(
  providerIcon: string | undefined,
  sourceHome: string | undefined,
  template = DEFAULT_SOURCE_ICON_SETTINGS.template,
): string | undefined {
  if (providerIcon) {
    return providerIcon
  }

  if (!sourceHome || !template.trim()) {
    return undefined
  }

  return getFavicon(sourceHome, template) || undefined
}
