export type Locale = "en" | "zh-CN" | "zh-TW"
export type LocalePreference = "system" | Locale

export function isLocalePreference(value: unknown): value is LocalePreference {
  return value === "system" || value === "en" || value === "zh-CN" || value === "zh-TW"
}

export function resolveLocale(language: string): Locale {
  if (/^zh-(?:TW|HK|MO)\b/iu.test(language)) return "zh-TW"
  if (/^zh\b/iu.test(language)) return "zh-CN"
  return "en"
}
