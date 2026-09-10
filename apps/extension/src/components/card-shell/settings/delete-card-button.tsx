import { ConfirmDestructiveButton } from "@/components/common/confirm-destructive-button"
import { PhTrashDuotone } from "@/components/icons/ph"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"

export function DeleteCardButton({ onDelete, label, pendingLabel, errorMessage }: {
  onDelete: () => Promise<void>
  label: string
  pendingLabel: string
  errorMessage: string
}): React.JSX.Element {
  const { t } = useI18n()
  const {
    error: deleteError,
    isPending: isDeleting,
    resetError: resetDeleteError,
    run: runDelete,
  } = useAsyncAction(errorMessage)

  return (
    <>
      <ConfirmDestructiveButton
        appearance="icon-expand"
        size="icon-fit"
        icon={<PhTrashDuotone />}
        label={label}
        confirmLabel={t("delete")}
        resetAfterMs={3000}
        pending={isDeleting}
        pendingLabel={pendingLabel}
        className="border-0 text-lg opacity-50 hover:opacity-85 data-[confirmation=armed]:h-6 data-[confirmation=armed]:gap-0.5 data-[confirmation=armed]:px-2 data-[confirmation=armed]:text-xs data-[confirmation=armed]:opacity-100 active:not-aria-[haspopup]:translate-y-0"
        title={deleteError ?? undefined}
        onArm={resetDeleteError}
        onConfirm={() => {
          void runDelete(onDelete)
        }}
      />
      {deleteError && <span role="alert" className="sr-only">{deleteError}</span>}
    </>
  )
}
