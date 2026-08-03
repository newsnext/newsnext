/* eslint-disable react-refresh/only-export-components */
import type { Color } from "@newsnext/shared/types"
import type { BoardSource, NewsItem } from "@/typings/source"
import { COLORS } from "@newsnext/shared/constants"
import { useState } from "react"
import { CardBack } from "@/components/card/card-back"
import { CardFront } from "@/components/card/card-front"

const UPDATED_AT = Date.now() - 4 * 60 * 1000

const SAMPLE_SOURCE: BoardSource = {
  id: "cosmos-source",
  sourceId: "cosmos.design",
  boardId: "all",
  provider: {
    title: "Cosmos Design",
    category: "developer",
    color: "violet",
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
    network: ["https://reactcosmos.org/*"],
    cookies: [],
  },
  cache: {
    version: 1,
    maxAge: "15m",
  },
}

const RANKING_ITEMS: NewsItem[] = [
  {
    title: "Designing UI states that are easy to verify",
    url: "https://example.com/designing-ui-states",
    inline: { text: "A practical guide to loading, empty, error, and success states." },
  },
  {
    title: "A component API that stays flexible",
    url: "https://example.com/component-api",
    inline: { text: "Patterns for composition without unnecessary wrappers." },
  },
  {
    title: "What makes a useful visual fixture?",
    url: "https://example.com/visual-fixtures",
    inline: { text: "Representative content, real interactions, and intentional edge cases." },
  },
  {
    title: "Color systems for light and dark themes",
    url: "https://example.com/color-systems",
  },
  {
    title: "Motion that clarifies interface state",
    url: "https://example.com/interface-motion",
  },
]

const TIMELINE_ITEMS: NewsItem[] = RANKING_ITEMS.map((item, index) => ({
  ...item,
  timestamp: Date.now() - index * 48 * 60 * 1000,
}))

function createColorSource(color: Color): BoardSource {
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

function CardStage({ children }: React.PropsWithChildren) {
  return (
    <main className="grid min-h-full place-items-center p-6 sm:p-10">
      <div className="h-125 w-full max-w-100">{children}</div>
    </main>
  )
}

interface FrontFixtureProps {
  items?: NewsItem[]
  isFetching?: boolean
  sourceErrorMessage?: string
  sourcePermissionRequired?: boolean
}

function FrontFixture({
  items = RANKING_ITEMS,
  isFetching = false,
  sourceErrorMessage,
  sourcePermissionRequired = false,
}: FrontFixtureProps) {
  const [updatedAt, setUpdatedAt] = useState(UPDATED_AT)

  return (
    <CardStage>
      <CardFront
        source={SAMPLE_SOURCE}
        items={items}
        isFetching={isFetching}
        isFetchingLatest={false}
        sourceErrorMessage={sourceErrorMessage}
        sourcePermissionDescription="Allow access to reactcosmos.org to load this source."
        sourcePermissionRequired={sourcePermissionRequired}
        updatedAt={updatedAt}
        onRefresh={() => setUpdatedAt(Date.now())}
        onRequestPermission={async () => true}
        onFlip={() => undefined}
      />
    </CardStage>
  )
}

function CardBackFixture() {
  const [source, setSource] = useState(SAMPLE_SOURCE)
  const [savedParams, setSavedParams] = useState<Record<string, unknown>>(
    SAMPLE_SOURCE.paramsValue ?? {},
  )
  const [draftParams, setDraftParams] = useState(savedParams)
  const hasChanges = JSON.stringify(draftParams) !== JSON.stringify(savedParams)

  return (
    <CardStage>
      <CardBack
        id={source.id}
        source={source}
        draftSourceParams={draftParams}
        hasSourceParams
        hasSourceParamChanges={hasChanges}
        updatedAt={UPDATED_AT}
        isDraft
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
    </CardStage>
  )
}

function RankingCardFixture() {
  return <FrontFixture />
}

function AllCardColorsFixture() {
  return (
    <main className="min-h-full p-6 sm:p-10">
      <div className="mx-auto grid max-w-360 grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] gap-6">
        {COLORS.map(color => (
          <div key={color} className="h-112 min-w-0">
            <CardFront
              source={createColorSource(color)}
              items={RANKING_ITEMS.slice(0, 4)}
              isFetching={false}
              isFetchingLatest={false}
              sourcePermissionDescription=""
              sourcePermissionRequired={false}
              updatedAt={UPDATED_AT}
              onRefresh={() => undefined}
              onRequestPermission={async () => true}
              onFlip={() => undefined}
            />
          </div>
        ))}
      </div>
    </main>
  )
}

function TimelineCardFixture() {
  return <FrontFixture items={TIMELINE_ITEMS} />
}

function LoadingCardFixture() {
  return <FrontFixture items={TIMELINE_ITEMS} isFetching />
}

function PermissionCardFixture() {
  return <FrontFixture items={[]} sourcePermissionRequired />
}

function ErrorCardFixture() {
  return <FrontFixture items={[]} sourceErrorMessage="The source could not be reached." />
}

export default {
  "Overview: All colors": AllCardColorsFixture,
  "Front: Ranking": RankingCardFixture,
  "Front: Timeline": TimelineCardFixture,
  "Front: Loading": LoadingCardFixture,
  "Front: Permission": PermissionCardFixture,
  "Front: Error": ErrorCardFixture,
  "Back: Editable": CardBackFixture,
}
