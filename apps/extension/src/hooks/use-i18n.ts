import { use } from "react"
import { useTranslation } from "react-i18next"
import { I18nRuntimeContext } from "@/lib/i18n"

export function useI18n() {
  const value = use(I18nRuntimeContext)
  const { t } = useTranslation("translation", { lng: value?.locale ?? "en" })
  if (!value) throw new Error("useI18n must be used within I18nProvider")
  return { ...value, t }
}
