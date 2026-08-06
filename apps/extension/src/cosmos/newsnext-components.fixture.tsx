/* eslint-disable react-refresh/only-export-components */
import type { Color } from "@newsnext/shared/types"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { DynamicIsland } from "@newsnext/ui/components/dynamic-island"
import { FlipAnimate } from "@newsnext/ui/components/flip-animate"
import { Input } from "@newsnext/ui/components/input"
import { Logo } from "@newsnext/ui/components/logo"
import { ProxiedImage } from "@newsnext/ui/components/proxied-image"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { SafeHtml } from "@newsnext/ui/components/safe-html"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@newsnext/ui/components/select"
import { ThemeSelector } from "@newsnext/ui/components/theme-selector"
import { VirtualList } from "@newsnext/ui/components/virtual-list"
import { WordmarkLogo } from "@newsnext/ui/components/wordmark-logo"
import { resolveSquircleStyle } from "@newsnext/ui/hooks/use-squircle"
import { ArrowRight, Bell } from "lucide-react"
import { useState } from "react"
import { useCornerRendering } from "@/cosmos/corner-rendering-context"

const CORNER_SHAPES = [
  { height: 32, radius: 8, width: 32 },
  { height: 40, radius: 10, width: 40 },
  { height: 44, radius: 12, width: 48 },
  { height: 48, radius: 13, width: 56 },
  { height: 52, radius: 14, width: 68 },
  { height: 56, radius: 15, width: 80 },
  { height: 60, radius: 17, width: 96 },
  { height: 64, radius: 18, width: 112 },
  { height: 68, radius: 20, width: 128 },
  { height: 72, radius: 22, width: 148 },
  { height: 76, radius: 24, width: 168 },
  { height: 80, radius: 26, width: 192 },
  { height: 88, radius: 30, width: 220 },
  { height: 96, radius: 32, width: 256 },
] as const

function FixturePage({ children }: React.PropsWithChildren): React.JSX.Element {
  return <main className="mx-auto grid min-h-full w-full max-w-2xl content-start gap-8 p-8">{children}</main>
}

function BrandAndActionsFixture(): React.JSX.Element {
  return (
    <FixturePage>
      <h1 className="text-xl font-semibold">Brand and actions</h1>
      <div className="flex items-center gap-4 rounded-2xl bg-background p-6 ring-1 ring-foreground/10">
        <Logo className="size-14 text-primary" />
        <WordmarkLogo className="h-auto w-52" />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>
        <Button>
          Continue
          <ArrowRight />
        </Button>
      </div>
    </FixturePage>
  )
}

function SelectorsFixture(): React.JSX.Element {
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable")

  return (
    <FixturePage>
      <h1 className="text-xl font-semibold">Selectors</h1>
      <RadioGroup
        variant="segmented"
        value={density}
        onValueChange={setDensity}
      >
        <RadioGroupItem value="compact">Compact</RadioGroupItem>
        <RadioGroupItem value="comfortable">Comfortable</RadioGroupItem>
      </RadioGroup>
      <Card variant="subtle">
        <CardContent className="grid gap-3">
          <Input variant="inline" aria-label="Inline title" defaultValue="Editable card title" />
          <Select variant="inline" defaultValue="daily">
            <SelectTrigger aria-label="Inline board"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily reading</SelectItem>
              <SelectItem value="research">Product research</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Selected:
        {" "}
        {density}
      </p>
    </FixturePage>
  )
}

function ThemeSelectorFixture(): React.JSX.Element {
  const [color, setColor] = useState<Color>("orange")

  return (
    <FixturePage>
      <h1 className="text-xl font-semibold">Theme selector</h1>
      <div className="h-28 w-full max-w-sm">
        <ThemeSelector value={color} onValueChange={setColor} layoutId="cosmos-theme" />
      </div>
      <p className="text-sm text-muted-foreground">
        Selected:
        {" "}
        {color}
      </p>
    </FixturePage>
  )
}

function FlipFixture(): React.JSX.Element {
  const [flipped, setFlipped] = useState(false)

  return (
    <FixturePage>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Flip animation</h1>
        <Button variant="outline" onClick={() => setFlipped(value => !value)}>Flip card</Button>
      </div>
      <FlipAnimate className="h-64" rotate="y" flipped={flipped}>
        <section className="grid place-items-center rounded-3xl bg-background text-xl ring-1 ring-foreground/10">Front</section>
        <section className="grid place-items-center rounded-3xl bg-primary text-xl text-primary-foreground">Back</section>
      </FlipAnimate>
    </FixturePage>
  )
}

function ContentSafetyFixture(): React.JSX.Element {
  const image = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='160'%3E%3Crect width='100%25' height='100%25' rx='24' fill='%23f97316'/%3E%3Ctext x='50%25' y='52%25' text-anchor='middle' font-family='sans-serif' font-size='24' fill='white'%3ENewsNext%3C/text%3E%3C/svg%3E"

  return (
    <FixturePage>
      <h1 className="text-xl font-semibold">Sanitized content and delayed media</h1>
      <SafeHtml
        as="div"
        className="prose rounded-2xl bg-background p-5 ring-1 ring-foreground/10"
        html={"<h2>Imported article</h2><p>Allowed <strong>formatting</strong> remains.</p><img src=x onerror=\"document.body.dataset.unsafe=1\">"}
      />
      <ProxiedImage className="h-40 w-80 rounded-3xl object-cover" src={image} delay={600} />
    </FixturePage>
  )
}

function VirtualListFixture(): React.JSX.Element {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const items = Array.from({ length: 100 }, (_, index) => `Article ${index + 1}`)

  return (
    <FixturePage>
      <h1 className="text-xl font-semibold">Virtual list</h1>
      <div ref={setScrollElement} className="h-96 overflow-auto rounded-2xl bg-background ring-1 ring-foreground/10">
        <VirtualList
          items={items}
          scrollElement={scrollElement}
          estimateSize={52}
          renderItem={(item, index) => (
            <div className="flex h-13 items-center gap-3 border-b px-4">
              <span className="w-8 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
              <span>{item}</span>
            </div>
          )}
        />
      </div>
    </FixturePage>
  )
}

function DynamicIslandFixture(): React.JSX.Element {
  return (
    <main className="min-h-full bg-muted/30 p-8 pt-24 text-center">
      <DynamicIsland top={28} largeWidth={360} largeHeight={180}>
        {isSmall => isSmall
          ? <div className="grid h-full place-items-center text-xs">Open controls</div>
          : (
              <div className="grid h-full place-content-center gap-3 p-6">
                <Logo className="mx-auto size-12 text-primary" />
                <strong>Dynamic island</strong>
                <span className="text-xs text-muted-foreground">Click outside or scroll to close.</span>
              </div>
            )}
      </DynamicIsland>
      <p className="text-sm text-muted-foreground">The island is fixed to the top of this fixture.</p>
    </main>
  )
}

function CornerShapesFixture(): React.JSX.Element {
  const { rendering } = useCornerRendering()

  return (
    <main className="mx-auto grid min-h-full w-full max-w-5xl content-start gap-8 p-8">
      <header className="grid gap-2">
        <h1 className="text-xl font-semibold">Corner shapes</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Compare corner rendering across increasing sizes and aspect ratios.
        </p>
      </header>
      <section className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {CORNER_SHAPES.map(shape => (
          <figure
            key={`${shape.width}x${shape.height}`}
            className="grid min-h-40 content-end justify-items-center gap-3"
          >
            <div className="flex h-28 w-full items-end justify-center">
              <div
                data-squircle
                className="bg-primary shadow-lg shadow-primary/15 ring-1 ring-primary-foreground/20"
                style={{
                  height: shape.height,
                  width: shape.width,
                  ...resolveSquircleStyle(shape.radius, rendering),
                }}
              />
            </div>
            <figcaption className="font-mono text-xs tabular-nums text-muted-foreground">
              {shape.width}
              ×
              {shape.height}
              {" · R"}
              {shape.radius}
            </figcaption>
          </figure>
        ))}
      </section>
    </main>
  )
}

export default {
  "Brand and actions": BrandAndActionsFixture,
  "Selectors": SelectorsFixture,
  "Theme selector": ThemeSelectorFixture,
  "Flip animation": FlipFixture,
  "Content safety": ContentSafetyFixture,
  "Virtual list": VirtualListFixture,
  "Dynamic island": DynamicIslandFixture,
  "Corner shapes": CornerShapesFixture,
}
