import type { ReactNode } from "react"
import type { SourceInstanceMetadata } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { ScrollArea } from "@newsnext/ui/components/scroll-area"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useState } from "react"
import { PhArrowCircleLeftDuotone } from "@/components/icons/ph"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { CardHeader, CardHeaderActionButton } from "../card-header"
import { CardSurface } from "../card-surface"
import { CardBoardSelect, DeleteCardButton } from "./actions"
import { CardEditForm } from "./edit-form"

export interface CardBackProps {
  id: string
  source: BoardSource
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  updatedAt: number
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => void
  onResetSourceParams: () => void
  onDiscardSourceParams: () => void
  onSaveSourceMeta: (meta: SourceInstanceMetadata) => void
  onFlip: () => void
  isDraft?: boolean
  dragHandle?: ReactNode
}

export function CardBack({
  id,
  source,
  draftSourceParams,
  hasSourceParams,
  hasSourceParamChanges,
  updatedAt,
  onSourceParamChange,
  onSaveSourceParams,
  onResetSourceParams,
  onDiscardSourceParams,
  onSaveSourceMeta,
  onFlip,
  isDraft = false,
  dragHandle,
}: CardBackProps) {
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
      <CardSurface className="transition-colors duration-300" />
      <div className="relative flex h-full flex-col p-2.5 transition-colors duration-300">
        <CardHeader
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
              {!isDraft && <DeleteCardButton id={id} />}
              <CardHeaderActionButton
                onClick={(e) => {
                  e.stopPropagation()
                  onFlip()
                }}
              >
                <PhArrowCircleLeftDuotone />
              </CardHeaderActionButton>
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
              {!isDraft && <CardBoardSelect id={id} boardId={source.boardId} />}
              <CardEditForm
                source={source}
                draftSourceParams={draftSourceParams}
                hasSourceParams={hasSourceParams}
                hasSourceParamChanges={hasSourceParamChanges}
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
