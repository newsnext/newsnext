import type { SourcePermissionRequest } from "@/lib/source"
import { useI18n } from "@/hooks/use-i18n"
import { getPermissionOriginLabel } from "@/lib/source"

export function SourcePermissionDetails({
  cookieOrigins = [],
  request,
}: {
  cookieOrigins?: readonly string[]
  request: SourcePermissionRequest
}): React.JSX.Element {
  const { t } = useI18n()
  const origins = request.origins?.map(getPermissionOriginLabel) ?? []
  const cookieOriginLabels = new Set(cookieOrigins.map(getPermissionOriginLabel))
  const usesCookies = request.permissions?.includes("cookies") ?? false

  return (
    <dl className="min-w-0 space-y-1 text-left">
      {origins.length > 0 && (
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 font-medium text-muted-foreground">{t("sites")}</dt>
          <dd className="min-w-0 text-right">
            <ul className="space-y-0.5 font-mono">
              {origins.map(origin => (
                <li key={origin} className="flex min-w-0 items-center justify-end gap-1.5">
                  {usesCookies && cookieOriginLabels.has(origin) && (
                    <span className="shrink-0 rounded-full bg-theme-500/10 px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium leading-4 text-theme-700 dark:text-theme-300">
                      {t("cookies")}
                    </span>
                  )}
                  <span className="break-all">{origin}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
    </dl>
  )
}
