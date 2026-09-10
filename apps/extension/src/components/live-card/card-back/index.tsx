import type { CardDragHandleRef } from "@/components/card-shell/card-header"
import type { SourceParamValidationState } from "@/components/card-shell/settings/parameter-settings"
import type { LiveCardMetadata } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { useState } from "react"
import { CardBackContent, CardShell } from "@/components/card-shell"
import { CardHeader, CardHeaderActionButton } from "@/components/card-shell/card-header"
import { PhArrowCircleLeftDuotone } from "@/components/icons/ph"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { DeleteLiveCardButton, LiveCardBoardSelect } from "./actions"
import { LiveCardEditForm } from "./edit-form"

export interface LiveCardBackProps {
  source: LiveCardViewModel
  target:
    | { kind: "card", cardId: string }
    | { kind: "draft" }
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  sourceParamValidation: SourceParamValidationState
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => Promise<void> | void
  onResetSourceParams: () => Promise<void> | void
  onDiscardSourceParams: () => void
  onResetSourceMeta?: () => Promise<void> | void
  onSaveSourceMeta: (meta: LiveCardMetadata) => Promise<void> | void
  onFlip: () => void
  dragHandleRef?: CardDragHandleRef
}

export function LiveCardBack({
  source,
  target,
  draftSourceParams,
  hasSourceParams,
  hasSourceParamChanges,
  sourceParamValidation,
  onSourceParamChange,
  onSaveSourceParams,
  onResetSourceParams,
  onDiscardSourceParams,
  onSaveSourceMeta,
  onResetSourceMeta,
  onFlip,
  dragHandleRef,
}: LiveCardBackProps) {
  const { provider } = source
  const { badge, desc, home, title } = source.metadata
  const [previewMetadata, setPreviewMetadata] = useState<LiveCardMetadata | null>(null)
  const previewTitle = previewMetadata?.title ?? title
  const previewBadge = previewMetadata?.badge ?? badge
  const previewDesc = previewMetadata?.desc ?? desc
  const previewHome = previewMetadata?.home ?? home
  const icon = useSourceIcon({
    provider,
    metadata: { home: previewHome },
  })

  return (
    <CardShell
      className={previewMetadata?.color}
      header={(
        <CardHeader
          badge={previewBadge}
          desc={previewDesc}
          home={previewHome}
          icon={icon}
          providerTitle={provider.title}
          title={previewTitle}
          dragHandleRef={dragHandleRef}
          actions={(
            <>
              {target.kind === "card" && <DeleteLiveCardButton id={target.cardId} />}
              <CardHeaderActionButton
                onClick={(e) => {
                  e.stopPropagation()
                  onFlip()
                }}
              >
                <PhArrowCircleLeftDuotone />
              </CardHeaderActionButton>
            </>
          )}
        />
      )}
    >
      <CardBackContent>
        {target.kind === "card" && <LiveCardBoardSelect id={target.cardId} />}
        <LiveCardEditForm
          source={source}
          draftSourceParams={draftSourceParams}
          hasSourceParams={hasSourceParams}
          hasSourceParamChanges={hasSourceParamChanges}
          sourceParamValidation={sourceParamValidation}
          onSourceParamChange={onSourceParamChange}
          onSaveSourceParams={onSaveSourceParams}
          onResetSourceParams={onResetSourceParams}
          onDiscardSourceParams={onDiscardSourceParams}
          onSaveSourceMeta={onSaveSourceMeta}
          onResetSourceMeta={onResetSourceMeta}
          onPreviewMetadataChange={setPreviewMetadata}
        />
      </CardBackContent>
    </CardShell>
  )
}
