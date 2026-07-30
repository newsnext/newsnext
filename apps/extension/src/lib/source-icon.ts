import {
  DEFAULT_FAVICON_URL_TEMPLATE,
  getFavicon,
} from "@newsnext/shared/utils"

export const SOURCE_ICON_PRESETS = {
  folo: {
    label: "Folo",
    template: DEFAULT_FAVICON_URL_TEMPLATE,
  },
  google: {
    label: "Google",
    template: "https://www.google.com/s2/favicons?domain={hostname}&sz=128",
  },
} as const

export type SourceIconSource = keyof typeof SOURCE_ICON_PRESETS | "custom"

export interface SourceIconSettings {
  source: SourceIconSource
  template: string
}

export const DEFAULT_SOURCE_ICON_SETTINGS: SourceIconSettings = {
  source: "folo",
  template: SOURCE_ICON_PRESETS.folo.template,
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
