import type { ReactNode } from "react"
import { Button } from "@newsnext/ui/components/button"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"

interface CardSettingsSectionProps {
  title: string
  editLabel: string
  editing: boolean
  dirty: boolean
  valid?: boolean
  errorMessage: string
  onEdit: () => void
  onCancel: () => void
  onSave: () => Promise<void>
  onReset?: () => Promise<void>
  children: ReactNode
}

export function CardSettingsSection({ title, editLabel, editing, dirty, valid = true, errorMessage, onEdit, onCancel, onSave, onReset, children }: CardSettingsSectionProps): React.JSX.Element {
  const { t } = useI18n()
  const { error, isPending, resetError, run } = useAsyncAction(errorMessage)
  return (
    <section className="flex flex-col text-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">{title}</span>
        {editing
          ? (
              <div className="ml-auto flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  tone="theme"
                  size="sm"
                  className="h-6 px-2"
                  disabled={isPending}
                  onClick={() => {
                    resetError()
                    onCancel()
                  }}
                >
                  {t("cancel")}
                </Button>
                {onReset && <Button type="button" variant="outline" tone="theme" size="sm" className="h-6 px-2" disabled={isPending} onClick={() => void run(onReset)}>{t("reset")}</Button>}
                <Button type="button" tone="theme" size="sm" className="h-6 px-2" disabled={isPending || !dirty || !valid} onClick={() => void run(onSave)}>{t("save")}</Button>
              </div>
            )
          : (
              <Button
                type="button"
                tone="theme"
                size="sm"
                title={editLabel}
                className="h-6 px-2"
                disabled={isPending}
                onClick={() => {
                  resetError()
                  onEdit()
                }}
              >
                {t("edit")}
              </Button>
            )}
      </div>
      <fieldset disabled={isPending} className="min-w-0">{children}</fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
