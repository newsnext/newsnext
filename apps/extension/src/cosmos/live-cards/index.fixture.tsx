/* eslint-disable react-refresh/only-export-components */
import type { Color } from "@newsnext/shared/types"
import type { SourcePermissionRequest } from "@/lib/source"
import type { LiveCardViewModel, NewsItem } from "@/typings/source"
import { COLORS } from "@newsnext/shared/constants"
import { useState } from "react"
import { LiveCardBack } from "@/components/live-card/card-back"
import { LiveCardFront } from "@/components/live-card/card-front"
import { cn } from "@/lib/utils"

const LOADED_AT = Date.now() - 4 * 60 * 1000

export const SAMPLE_SOURCE: LiveCardViewModel = {
  id: "cosmos-source",
  sourceId: "cosmos.design",
  boardId: "V1StGXR8_Z5j",
  provider: {
    title: "Cosmos Design",
    category: "developer",
    color: "purple",
  },
  metadata: {
    title: "Design Dispatch",
    desc: "Product, interface, and design-system updates",
    home: "https://reactcosmos.org",
  },
  params: {
    category: {
      type: "select",
      title: "Category",
      description: "Choose the primary feed category.",
      values: [
        { label: "Design", value: "design" },
        { label: "Engineering", value: "engineering" },
        { label: "Product", value: "product" },
      ],
      default: "design",
    },
    compact: {
      type: "switch",
      title: "Compact summaries",
      description: "Show shorter descriptions in the feed.",
      default: false,
    },
    limit: {
      type: "number",
      title: "Item limit",
      min: 5,
      max: 50,
      default: 20,
    },
  },
  paramsValue: {
    category: "design",
    compact: false,
    limit: 20,
  },
  capabilities: {
    network: ["reactcosmos.org"],
    cookies: ["reactcosmos.org"],
  },
  version: 1,
}

const RANKING_ITEMS: NewsItem[] = [
  {
    title: "Designing UI states that are easy to verify",
    url: "https://example.com/designing-ui-states",
    author: { name: "Cosmos Design" },
    attributes: { category: "UI states" },
    content: {
      text: [
        "A practical guide to making loading, empty, error, and success states observable and reliable.",
        "Start by treating each state as part of the product rather than a temporary implementation detail. The best interfaces make progress, recovery, and the next available action immediately clear.",
        "Use realistic content in visual fixtures, keep controls stable as data changes, and verify narrow and wide layouts independently.",
      ].join("\n\n"),
      pictures: [
        "https://picsum.photos/seed/newsnext-design-1/1200/675",
        "https://picsum.photos/seed/newsnext-design-2/1200/675",
        "https://picsum.photos/seed/newsnext-design-3/1200/675",
      ],
    },
  },
  {
    title: "A component API that stays flexible",
    url: "https://example.com/component-api",
    attributes: { category: "Composition" },
    content: { text: "Composition patterns that keep component APIs adaptable without pushing complexity onto callers." },
  },
  {
    title: "What makes a useful visual fixture?",
    url: "https://example.com/visual-fixtures",
    attributes: { category: "Testing" },
    content: { text: "Build fixtures around meaningful product states so visual regressions are quick to understand." },
  },
  {
    title: "Color systems for light and dark themes",
    url: "https://example.com/color-systems",
    content: { text: "Use semantic roles and perceptual contrast to keep a palette coherent across appearance modes." },
  },
  {
    title: "Motion that clarifies interface state",
    url: "https://example.com/interface-motion",
    content: { text: "Motion should explain where content came from, where it went, and what changed." },
  },
]

const TIMELINE_ITEMS: NewsItem[] = RANKING_ITEMS.map((item, index) => ({
  ...item,
  publishedAt: Date.now() - index * 48 * 60 * 1000,
}))

const RANKING_SOURCE: LiveCardViewModel = {
  ...SAMPLE_SOURCE,
  metadata: {
    ...SAMPLE_SOURCE.metadata,
    type: "ranking",
  },
}

function createColorSource(color: Color): LiveCardViewModel {
  const label = `${color.charAt(0).toUpperCase()}${color.slice(1)}`
  return {
    ...SAMPLE_SOURCE,
    id: `cosmos-${color}`,
    sourceId: `cosmos.${color}`,
    provider: {
      ...SAMPLE_SOURCE.provider,
      title: `${label} Source`,
      color,
    },
    metadata: {
      ...SAMPLE_SOURCE.metadata,
      title: `${label} Dispatch`,
    },
  }
}

interface LiveCardFrameProps extends React.PropsWithChildren {
  className?: string
  color: Color
}

function LiveCardFrame({ children, className, color }: LiveCardFrameProps) {
  return <div className={cn(color, className)}>{children}</div>
}

function LiveCardStage({ children }: React.PropsWithChildren) {
  return (
    <main className="grid min-h-full place-items-center p-6 sm:p-10">
      <LiveCardFrame
        className="h-125 w-full max-w-100"
        color={SAMPLE_SOURCE.provider.color}
      >
        {children}
      </LiveCardFrame>
    </main>
  )
}

interface FrontFixtureProps {
  items?: NewsItem[]
  source?: LiveCardViewModel
  isFetching?: boolean
  isContentFetching?: boolean
  sourceErrorMessage?: string
  sourcePermissionRequest?: SourcePermissionRequest
}

function FrontFixture({
  items = RANKING_ITEMS,
  source = SAMPLE_SOURCE,
  isFetching = false,
  isContentFetching = false,
  sourceErrorMessage,
  sourcePermissionRequest,
}: FrontFixtureProps) {
  const [loadedAt, setLoadedAt] = useState(LOADED_AT)

  return (
    <LiveCardStage>
      <LiveCardFront
        source={source}
        items={items}
        isFetching={isFetching}
        isContentFetching={isContentFetching}
        sourceErrorMessage={sourceErrorMessage}
        sourcePermissionRequest={sourcePermissionRequest}
        loadedAt={loadedAt}
        onRefresh={() => setLoadedAt(Date.now())}
        onRequestPermission={async () => true}
        onFlip={() => undefined}
      />
    </LiveCardStage>
  )
}

function LiveCardBackFixture() {
  const [source, setSource] = useState(SAMPLE_SOURCE)
  const [savedParams, setSavedParams] = useState<Record<string, unknown>>(
    SAMPLE_SOURCE.paramsValue ?? {},
  )
  const [draftParams, setDraftParams] = useState(savedParams)
  const hasChanges = JSON.stringify(draftParams) !== JSON.stringify(savedParams)

  return (
    <LiveCardStage>
      <LiveCardBack
        source={source}
        target={{ kind: "draft" }}
        draftSourceParams={draftParams}
        hasSourceParams
        hasSourceParamChanges={hasChanges}
        sourceParamValidation={{ errors: {}, valid: true }}
        loadedAt={LOADED_AT}
        onSourceParamChange={(key, value) => {
          setDraftParams(current => ({ ...current, [key]: value }))
        }}
        onSaveSourceParams={() => setSavedParams(draftParams)}
        onResetSourceParams={() => {
          setDraftParams({ category: "design", compact: false, limit: 20 })
        }}
        onDiscardSourceParams={() => setDraftParams(savedParams)}
        onSaveSourceMeta={(metadata) => {
          setSource(current => ({
            ...current,
            metadata: { ...current.metadata, ...metadata },
          }))
        }}
        onFlip={() => undefined}
      />
    </LiveCardStage>
  )
}

function RankingCardFixture() {
  return <FrontFixture source={RANKING_SOURCE} />
}

function ListCardFixture() {
  return <FrontFixture />
}

function AllCardColorsFixture() {
  return (
    <main className="min-h-full p-6 sm:p-10">
      <div className="mx-auto grid max-w-360 grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] gap-6">
        {COLORS.map(color => (
          <LiveCardFrame key={color} className="h-112 min-w-0" color={color}>
            <LiveCardFront
              source={createColorSource(color)}
              items={RANKING_ITEMS.slice(0, 4)}
              isFetching={false}
              isContentFetching={false}
              loadedAt={LOADED_AT}
              onRefresh={() => undefined}
              onRequestPermission={async () => true}
              onFlip={() => undefined}
            />
          </LiveCardFrame>
        ))}
      </div>
    </main>
  )
}

function TimelineCardFixture() {
  return <FrontFixture items={TIMELINE_ITEMS} />
}

function LoadingCardFixture() {
  return <FrontFixture items={TIMELINE_ITEMS} isFetching isContentFetching />
}

function PermissionCardFixture() {
  return (
    <FrontFixture
      items={[]}
      sourcePermissionRequest={{
        origins: ["*://reactcosmos.org/*"],
        permissions: ["cookies"],
      }}
    />
  )
}

function ErrorCardFixture() {
  return <FrontFixture items={[]} sourceErrorMessage="The source could not be reached." />
}

export default {
  Overview: AllCardColorsFixture,
  List: ListCardFixture,
  Ranking: RankingCardFixture,
  Timeline: TimelineCardFixture,
  Loading: LoadingCardFixture,
  Permission: PermissionCardFixture,
  Error: ErrorCardFixture,
  Editable: LiveCardBackFixture,
}
