import type { Locale, LocalePreference } from "./locale"
import type { MessageKey } from "./resources/en"
import i18next from "i18next"
import { createContext } from "react"
import { initReactI18next } from "react-i18next"
import { en } from "./resources/en"
import { zhCN } from "./resources/zh-CN"
import { zhTW } from "./resources/zh-TW"

export type { Locale, LocalePreference } from "./locale"
export type { MessageKey } from "./resources/en"

type PlaceholderKeys<Key extends MessageKey> = ExtractPlaceholders<typeof en[Key]>
type ExtractPlaceholders<Value extends string>
  = Value extends `${string}{{${infer Key}}}${infer Rest}`
    ? Key | ExtractPlaceholders<Rest>
    : never
export type StaticMessageKey = {
  [Key in MessageKey]: [PlaceholderKeys<Key>] extends [never] ? Key : never
}[MessageKey]

const resources = {
  "en": { translation: en },
  "zh-CN": { translation: zhCN },
  "zh-TW": { translation: zhTW },
} as const

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    returnNull: false
    resources: typeof resources.en
  }
}

void i18next
  .use(initReactI18next)
  .init({
    defaultNS: "translation",
    fallbackLng: "en",
    initAsync: false,
    interpolation: { escapeValue: false },
    lng: "en",
    ns: ["translation"],
    resources,
    returnNull: false,
    supportedLngs: ["en", "zh-CN", "zh-TW"],
  })

export { i18next }

export interface I18nRuntimeContextValue {
  locale: Locale
  preference: LocalePreference
  setPreference: (preference: LocalePreference) => void
}

export const I18nRuntimeContext = createContext<I18nRuntimeContextValue | undefined>(undefined)
