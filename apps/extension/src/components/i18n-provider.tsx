import type { PropsWithChildren } from "react"
import type { I18nRuntimeContextValue, Locale } from "@/lib/i18n"
import { useAtom } from "jotai"
import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { I18nextProvider } from "react-i18next"
import { i18next, I18nRuntimeContext } from "@/lib/i18n"
import { resolveLocale } from "@/lib/i18n/locale"
import { localePreferenceAtom } from "@/store/settings"

function detectSystemLocale(): Locale {
  return resolveLocale(navigator.languages[0] ?? navigator.language)
}

export function I18nProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [preference, setPreference] = useAtom(localePreferenceAtom)
  const [systemLocale, setSystemLocale] = useState<Locale>(detectSystemLocale)
  const locale = preference === "system" ? systemLocale : preference

  useEffect(() => {
    const update = () => setSystemLocale(detectSystemLocale())
    window.addEventListener("languagechange", update)
    return () => window.removeEventListener("languagechange", update)
  }, [])

  useLayoutEffect(() => {
    void i18next.changeLanguage(locale)
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nRuntimeContextValue>(() => ({
    locale,
    preference,
    setPreference,
  }), [locale, preference, setPreference])

  return (
    <I18nextProvider i18n={i18next}>
      <I18nRuntimeContext value={value}>{children}</I18nRuntimeContext>
    </I18nextProvider>
  )
}
