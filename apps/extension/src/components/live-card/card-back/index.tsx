import type { ReactNode } from "react"
import type { SourceParamValidationState } from "./edit-form"
import type { SourceInstanceMetadata } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { ScrollArea } from "@newsnext/ui/components/scroll-area"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useState } from "react"
import { PhArrowCircleLeftDuotone } from "@/components/icons/ph"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { LiveCardHeader, LiveCardHeaderActionButton } from "../card-header"
import { LiveCardSurface } from "../card-surface"
import { DeleteLiveCardButton, LiveCardBoardSelect } from "./actions"
import { LiveCardEditForm } from "./edit-form"

export interface LiveCardBackProps {
  id: string
  source: LiveCardViewModel
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  sourceParamValidation: SourceParamValidationState
  updatedAt: number
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => Promise<void> | void
  onResetSourceParams: () => Promise<void> | void
  onDiscardSourceParams: () => void
  onSaveSourceMeta: (meta: SourceInstanceMetadata) => Promise<void> | void
  onFlip: () => void
  isDraft?: boolean
  dragHandle?: ReactNode
}

export function LiveCardBack({
  id,
  source,
  draftSourceParams,
  hasSourceParams,
  hasSourceParamChanges,
  sourceParamValidation,
  updatedAt,
  onSourceParamChange,
  onSaveSourceParams,
  onResetSourceParams,
  onDiscardSourceParams,
  onSaveSourceMeta,
  onFlip,
  isDraft = false,
  dragHandle,
}: LiveCardBackProps) {
  const { provider } = source
  const { badge, desc, home, title } = source.metadata
  const [previewMetadata, setPreviewMetadata] = useState<SourceInstanceMetadata | null>(null)
  const previewTitle = previewMetadata?.title ?? title
  const previewBadge = previewMetadata?.badge ?? badge
  const previewDesc = previewMetadata?.desc ?? desc
  const previewHome = previewMetadata?.home ?? home
  const icon = useSourceIcon({
    provider,
    metadata: { home: previewHome },
  })

  return (
    <div className="relative h-full">
      <LiveCardSurface className="transition-colors duration-300" />
      <div className="relative flex h-full flex-col p-2.5 transition-colors duration-300">
        <LiveCardHeader
          badge={previewBadge}
          className="mb-2"
          desc={previewDesc}
          home={previewHome}
          icon={icon}
          provider={provider}
          title={previewTitle}
          subtitle={previewDesc || <RelativeTime date={updatedAt} />}
          actions={(
            <>
              {!isDraft && <DeleteLiveCardButton id={id} />}
              <LiveCardHeaderActionButton
                onClick={(e) => {
                  e.stopPropagation()
                  onFlip()
                }}
              >
                <PhArrowCircleLeftDuotone />
              </LiveCardHeaderActionButton>
              {dragHandle}
            </>
          )}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <SquircleBox
            aria-hidden
            radius="2xl"
            className="pointer-events-none absolute inset-0 bg-background/70 zenith-theme-400"
          />
          <ScrollArea
            onPointerDown={event => event.stopPropagation()}
            className="relative size-full rounded-2xl overflow-hidden"
          >
            <div className="p-3 space-y-4">
              {!isDraft && <LiveCardBoardSelect id={id} />}
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
                onPreviewMetadataChange={setPreviewMetadata}
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
