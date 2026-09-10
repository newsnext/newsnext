import type { LiveCardDragHandleRef } from "../card-header"
import type { SourceParamValidationState } from "./parameter-settings"
import type { InstanceMetadata } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { useState } from "react"
import { PhArrowCircleLeftDuotone } from "@/components/icons/ph"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { CardBackContent, CardFace } from "../card-face"
import { LiveCardHeader, LiveCardHeaderActionButton } from "../card-header"
import { DeleteLiveCardButton, LiveCardBoardSelect } from "./actions"
import { LiveCardEditForm } from "./edit-form"

export interface LiveCardBackProps {
  source: LiveCardViewModel
  target:
    | { kind: "instance", instanceId: string }
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
  onSaveSourceMeta: (meta: InstanceMetadata) => Promise<void> | void
  onFlip: () => void
  dragHandleRef?: LiveCardDragHandleRef
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
  const [previewMetadata, setPreviewMetadata] = useState<InstanceMetadata | null>(null)
  const previewTitle = previewMetadata?.title ?? title
  const previewBadge = previewMetadata?.badge ?? badge
  const previewDesc = previewMetadata?.desc ?? desc
  const previewHome = previewMetadata?.home ?? home
  const icon = useSourceIcon({
    provider,
    metadata: { home: previewHome },
  })

  return (
    <CardFace
      className={previewMetadata?.color}
      header={(
        <LiveCardHeader
          badge={previewBadge}
          desc={previewDesc}
          home={previewHome}
          icon={icon}
          providerTitle={provider.title}
          title={previewTitle}
          dragHandleRef={dragHandleRef}
          actions={(
            <>
              {target.kind === "instance" && <DeleteLiveCardButton id={target.instanceId} />}
              <LiveCardHeaderActionButton
                onClick={(e) => {
                  e.stopPropagation()
                  onFlip()
                }}
              >
                <PhArrowCircleLeftDuotone />
              </LiveCardHeaderActionButton>
            </>
          )}
        />
      )}
    >
      <CardBackContent>
        {target.kind === "instance" && <LiveCardBoardSelect id={target.instanceId} />}
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
    </CardFace>
  )
}
