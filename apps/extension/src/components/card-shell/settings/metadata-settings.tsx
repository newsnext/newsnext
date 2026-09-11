import type { CardMetadata } from "@newsnext/sdk/models"
import { useEffect, useState } from "react"
import { CardColorSelector } from "@/components/card-shell/settings/card-color-selector"
import { EditableImage, EditableInput, Info } from "@/components/card-shell/settings/fields"
import { CardSettingsSection } from "@/components/card-shell/settings/settings-section"
import { useI18n } from "@/hooks/use-i18n"

interface CardMetadataSettingsProps {
  metadata: CardMetadata
  onPreviewMetadataChange?: (metadata: CardMetadata | null) => void
  onSave: (metadata: CardMetadata) => Promise<void> | void
  onReset?: () => Promise<void> | void
}

export function CardMetadataSettings({ metadata, onSave, onReset, onPreviewMetadataChange }: CardMetadataSettingsProps): React.JSX.Element {
  const { t } = useI18n()
  const [draft, setDraft] = useState<CardMetadata | null>(null)
  useEffect(() => {
    onPreviewMetadataChange?.(draft)
  }, [draft, onPreviewMetadataChange])
  const isEditing = draft !== null
  const current = { ...metadata, ...draft }
  const selectedColor = current.color ?? "slate"
  const isDirty = draft !== null && Object.keys(draft).some(key => draft[key as keyof CardMetadata] !== metadata[key as keyof CardMetadata])

  return (
    <CardSettingsSection
      title={t("metadata")}
      editLabel={t("editMetadata")}
      editing={isEditing}
      dirty={isDirty}
      errorMessage={t("saveCardFailed")}
      onEdit={() => setDraft({})}
      onCancel={() => setDraft(null)}
      onSave={async () => {
        if (!draft) return
        await onSave(draft)
        setDraft(null)
      }}
      onReset={onReset
        ? async () => {
          await onReset()
          setDraft(null)
        }
        : undefined}
    >
      <Info label={t("title")}>
        <EditableInput text={current.title ?? ""} editable={isEditing} onChange={title => setDraft(previous => ({ ...previous, title }))} />
      </Info>
      <Info label={t("description")}>
        <EditableInput text={current.desc ?? ""} editable={isEditing} onChange={desc => setDraft(previous => ({ ...previous, desc }))} />
      </Info>
      <Info label={t("home")}>
        <EditableInput text={current.home ?? ""} editable={isEditing} onChange={home => setDraft(previous => ({ ...previous, home }))} />
      </Info>
      <Info label={t("badge")}>
        <EditableImage src={current.badge ?? ""} alt={`${current.title ?? ""} badge`} rounded editable={isEditing} onChange={badge => setDraft(previous => ({ ...previous, badge }))} />
      </Info>
      <Info label={t("themeColor")}>
        <CardColorSelector
          value={selectedColor}
          editable={isEditing}
          onValueChange={color => setDraft(previous => ({ ...previous, color }))}
        />
      </Info>
    </CardSettingsSection>
  )
}
