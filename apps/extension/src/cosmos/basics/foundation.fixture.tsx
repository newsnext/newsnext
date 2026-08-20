import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@newsnext/ui/components/avatar"
import { Badge } from "@newsnext/ui/components/badge"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@newsnext/ui/components/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@newsnext/ui/components/command"
import { PillGroup, PillGroupIndicator, pillGroupItemClassName } from "@newsnext/ui/components/pill-group"
import { ScrollArea } from "@newsnext/ui/components/scroll-area"
import { ArrowRight, Bell, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import {
  PhArrowCircleLeftDuotone,
  PhArrowCounterClockwiseDuotone,
  PhInfo,
  PhInfoDuotone,
  PhTrashDuotone,
} from "@/components/icons/ph"
import { LiveCardHeaderActionButton } from "@/components/live-card/card-header"
import { FixturePage, FixtureSection, FixtureState } from "@/cosmos/fixture-layout"

const SEMANTIC_COLORS = [
  { name: "Background", variable: "--background", foreground: "--foreground" },
  { name: "Primary", variable: "--primary", foreground: "--primary-foreground" },
  { name: "Secondary", variable: "--secondary", foreground: "--secondary-foreground" },
  { name: "Muted", variable: "--muted", foreground: "--muted-foreground" },
  { name: "Accent", variable: "--accent", foreground: "--accent-foreground" },
  { name: "Destructive", variable: "--destructive", foreground: "--color-white" },
] as const

const CONTROL_COLORS = [
  { name: "Border", variable: "--border" },
  { name: "Input", variable: "--input" },
  { name: "Ring", variable: "--ring" },
] as const

const THEME_SHADES = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const

function colorLabel(color: Color): string {
  return `${color.charAt(0).toUpperCase()}${color.slice(1)}`
}

function ButtonFixtureState({ children, label }: React.PropsWithChildren<{ label: string }>): React.JSX.Element {
  return (
    <FixtureState label={label}>
      <div className="flex max-w-full">{children}</div>
    </FixtureState>
  )
}

function ColorsFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Colors"
      description="The complete semantic and provider palette used by NewsNext, collected in one reference."
    >
      <FixtureSection title="Semantic colors" description="Components consume these role-based pairs so their contrast follows the active appearance mode.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEMANTIC_COLORS.map(color => (
            <div
              key={color.variable}
              className="grid min-h-28 content-between rounded-xl border p-4"
              style={{
                backgroundColor: `var(${color.variable})`,
                color: `var(${color.foreground})`,
              }}
            >
              <span className="text-sm font-medium">{color.name}</span>
              <code className="font-mono text-[10px] opacity-70">
                {color.variable}
                {" / "}
                {color.foreground}
              </code>
            </div>
          ))}
        </div>
      </FixtureSection>

      <FixtureSection title="Control colors" description="Borders, inputs, and focus rings are supporting colors rather than standalone surfaces.">
        <div className="grid gap-3 sm:grid-cols-3">
          {CONTROL_COLORS.map(color => (
            <div key={color.variable} className="flex items-center gap-3 rounded-xl bg-background p-3 ring-1 ring-foreground/10">
              <span
                aria-hidden="true"
                className="size-10 shrink-0 rounded-lg ring-1 ring-foreground/10"
                style={{ backgroundColor: `var(${color.variable})` }}
              />
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">{color.name}</span>
                <code className="font-mono text-[10px] text-muted-foreground">{color.variable}</code>
              </div>
            </div>
          ))}
        </div>
      </FixtureSection>

      <FixtureSection title="Provider themes" description="Every source color exposes the same 100–900 scale; shade 500 drives the scoped primary action.">
        <div className="grid gap-4">
          {COLORS.map(color => (
            <div key={color} className={`${color} grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center`}>
              <span className="text-sm font-medium">{colorLabel(color)}</span>
              <div className="grid grid-cols-9 overflow-hidden rounded-xl ring-1 ring-foreground/10">
                {THEME_SHADES.map(shade => (
                  <div
                    key={shade}
                    className="grid aspect-square min-w-0 place-items-end p-1"
                    style={{ backgroundColor: `var(--color-theme-${shade})` }}
                    title={`${color} ${shade}`}
                  >
                    <span className={`hidden font-mono text-[9px] sm:block ${shade < 500 ? "text-neutral-900/65" : "text-white/75"}`}>
                      {shade}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FixtureSection>
    </FixturePage>
  )
}

function TypographyFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Typography"
      description="The reading hierarchy used across navigation, LiveCards, settings, and article metadata."
    >
      <FixtureSection title="Type scale" description="A compact sans-serif scale keeps dense extension surfaces readable without flattening hierarchy.">
        <div className="divide-y divide-border/60">
          <div className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Display · 30/36</span>
            <p className="text-3xl font-semibold tracking-tight">A quieter way to follow the web</p>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Heading · 20/28</span>
            <p className="text-xl font-semibold">Design systems that survive real content</p>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Title · 16/24</span>
            <p className="text-base font-medium">Browser-native feeds gain better offline support</p>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Body · 14/24</span>
            <p className="max-w-2xl text-sm leading-6">NewsNext keeps source configuration close to the reading experience, so updates remain understandable without opening a separate dashboard.</p>
          </div>
          <div className="grid gap-3 pt-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Caption · 12/16</span>
            <p className="text-xs text-muted-foreground">Updated 4 minutes ago · 28 unread articles</p>
          </div>
        </div>
      </FixtureSection>

      <div className="grid gap-6 md:grid-cols-2">
        <FixtureSection title="Reading rhythm" description="Headline, summary, and metadata reproduce the hierarchy of a real feed item.">
          <article className="grid gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Engineering</Badge>
              <span>12 minutes ago</span>
            </div>
            <h2 className="text-xl font-semibold leading-snug tracking-tight">Local-first software is changing how browser tools store state</h2>
            <p className="text-sm leading-6 text-foreground/75">A practical look at durable storage, synchronization boundaries, and why small tools benefit from keeping data close to the reader.</p>
            <a className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline" href="https://example.com">Read the full article</a>
          </article>
        </FixtureSection>

        <FixtureSection title="Utility text" description="Labels and data use tighter spacing and tabular alignment without competing with reading content.">
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-4 text-sm">
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-medium">Hacker News</dd>
            <dt className="text-muted-foreground">Refresh interval</dt>
            <dd className="font-mono text-xs">15m</dd>
            <dt className="text-muted-foreground">Cached articles</dt>
            <dd className="font-mono text-xs tabular-nums">1,248</dd>
            <dt className="text-muted-foreground">Provider ID</dt>
            <dd><code className="rounded-md bg-muted px-1.5 py-1 font-mono text-xs">hackernews.top</code></dd>
          </dl>
          <div className="border-t border-border/60 pt-4">
            <p className="text-xs leading-5 text-muted-foreground">Muted text explains state and consequence. It should support the primary label, never repeat it.</p>
          </div>
        </FixtureSection>
      </div>
    </FixturePage>
  )
}

export function ButtonsFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Buttons"
      description="Every shared button variant, size, state, and supported color context in one reference."
    >
      <FixtureSection title="Variants" description="Use one filled action per decision group; quieter variants carry secondary or contextual intent.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ButtonFixtureState label="Default"><Button>Save changes</Button></ButtonFixtureState>
          <ButtonFixtureState label="Secondary"><Button variant="secondary">View source</Button></ButtonFixtureState>
          <ButtonFixtureState label="Outline"><Button variant="outline">Cancel</Button></ButtonFixtureState>
          <ButtonFixtureState label="Ghost"><Button variant="ghost">Dismiss</Button></ButtonFixtureState>
          <ButtonFixtureState label="Destructive">
            <Button variant="destructive">
              <Trash2 data-icon="inline-start" />
              Delete source
            </Button>
          </ButtonFixtureState>
          <ButtonFixtureState label="Link"><Button variant="link">Read documentation</Button></ButtonFixtureState>
          <ButtonFixtureState label="Transparent">
            <div className="rounded-full bg-muted p-1"><Button variant="transparent">Board tab</Button></div>
          </ButtonFixtureState>
        </div>
      </FixtureSection>

      <FixtureSection title="Text sizes" description="The four text sizes preserve the same hierarchy and content padding.">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </FixtureSection>

      <FixtureSection title="Icon sizes" description="Icon-only buttons require an accessible label; icon-fit removes the button box for inline controls.">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="icon-xs" variant="outline" aria-label="Add source"><Plus /></Button>
          <Button size="icon-sm" variant="outline" aria-label="Notifications"><Bell /></Button>
          <Button size="icon" variant="outline" aria-label="More options"><MoreHorizontal /></Button>
          <Button size="icon-lg" variant="outline" aria-label="Add source"><Plus /></Button>
          <Button size="icon-fit" variant="ghost" aria-label="More options"><MoreHorizontal /></Button>
        </div>
      </FixtureSection>

      <div className="grid gap-6 md:grid-cols-2">
        <FixtureSection title="Content" description="Leading and trailing icons adjust their adjacent padding through data-icon placement.">
          <div className="flex flex-wrap gap-2">
            <Button>
              <Plus data-icon="inline-start" />
              Add source
            </Button>
            <Button variant="outline">
              Continue
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="icon" aria-label="Notifications"><Bell /></Button>
          </div>
        </FixtureSection>

        <FixtureSection title="States" description="Disabled, invalid, and expanded states are owned by the shared primitive.">
          <div className="flex flex-wrap gap-2">
            <Button disabled>Disabled</Button>
            <Button aria-invalid="true">Invalid</Button>
            <Button variant="outline" aria-expanded="true">Expanded</Button>
          </div>
        </FixtureSection>
      </div>

      <FixtureSection title="LiveCard buttons" description="LiveCard controls stay inside the provider theme scope without moving the complete LiveCard into Basics.">
        <div className="purple grid gap-5 rounded-2xl bg-theme-400/45 p-4">
          <FixtureState label="Header controls">
            <div className="flex items-center gap-3 text-theme-400">
              <Button variant="transparent" size="icon-sm" className="rounded-full" aria-label="Open provider">
                <span className="grid size-8 place-items-center rounded-full bg-theme-500 text-xs font-bold text-white">NN</span>
              </Button>
              <div className="flex items-center gap-2">
                <LiveCardHeaderActionButton aria-label="Refresh"><PhArrowCounterClockwiseDuotone /></LiveCardHeaderActionButton>
                <LiveCardHeaderActionButton aria-label="View details"><PhInfoDuotone /></LiveCardHeaderActionButton>
                <LiveCardHeaderActionButton aria-label="Delete LiveCard"><PhTrashDuotone /></LiveCardHeaderActionButton>
                <LiveCardHeaderActionButton aria-label="Flip LiveCard"><PhArrowCircleLeftDuotone /></LiveCardHeaderActionButton>
              </div>
            </div>
          </FixtureState>

          <FixtureState label="Edit actions">
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" tone="theme" className="h-6 px-2">Edit</Button>
              <Button type="button" variant="outline" tone="theme" size="sm" className="h-6 px-2">Cancel</Button>
              <Button type="button" variant="outline" tone="theme" size="sm" className="h-6 px-2">Reset</Button>
              <Button type="button" size="sm" tone="theme" className="h-6 px-2">Save</Button>
              <Button type="button" size="sm" tone="theme" className="h-6 px-2" disabled>Save</Button>
            </div>
          </FixtureState>

          <FixtureState label="Parameter choices">
            <div className="flex flex-wrap gap-1">
              <Button type="button" size="xs" tone="theme" className="h-6">Design</Button>
              <Button type="button" size="xs" variant="outline" tone="theme" className="h-6">Engineering</Button>
              <Button type="button" size="xs" variant="outline" tone="theme" className="h-6">Product</Button>
            </div>
          </FixtureState>

          <FixtureState label="Source state">
            <div className="flex max-w-full">
              <Button
                type="button"
                variant="outline"
                tone="theme"
                className="h-10 max-w-full gap-2 bg-background/50 px-4 font-semibold shadow-sm backdrop-blur"
              >
                <PhInfo />
                Authorize
              </Button>
            </div>
          </FixtureState>
        </div>
      </FixtureSection>

      <FixtureSection title="Composition" description="The render prop injects button behavior into a link without adding a wrapper element.">
        <Button className="w-fit max-w-full" render={<a href="https://example.com" />} variant="link">
          Open source
          <ArrowRight data-icon="inline-end" />
        </Button>
      </FixtureSection>
    </FixturePage>
  )
}

export function BadgesFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Badges"
      description="Compact status labels for metadata, state, and inline links."
    >
      <FixtureSection title="Variants" description="Badge hierarchy follows the same semantic roles as buttons at a denser scale.">
        <div className="flex flex-wrap gap-2">
          <Badge>Active</Badge>
          <Badge variant="secondary">Queued</Badge>
          <Badge variant="destructive">Failed</Badge>
          <Badge variant="outline">Draft</Badge>
          <Badge variant="ghost">Muted</Badge>
          <Badge variant="link">Documentation</Badge>
        </div>
      </FixtureSection>
    </FixturePage>
  )
}

export function SurfacesFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Card and avatars"
      description="Container hierarchy and identity primitives shown on the same quiet catalog canvas."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <FixtureSection title="Card" description="Default and subtle surfaces share the same content structure.">
          <Card>
            <CardHeader>
              <CardTitle>Source summary</CardTitle>
              <CardDescription>Reusable content structure for settings and supporting information.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">12 sources · refreshed 4 minutes ago</CardContent>
            <CardFooter className="justify-end gap-2">
              <Button size="sm" variant="outline">Review</Button>
              <Button size="sm">Open</Button>
            </CardFooter>
          </Card>
        </FixtureSection>

        <FixtureSection title="Avatars" description="Fallbacks, presence badges, sizes, and compact groups.">
          <div className="flex flex-wrap items-center gap-8">
            <FixtureState label="Presence">
              <Avatar size="lg">
                <AvatarFallback>NN</AvatarFallback>
                <AvatarBadge />
              </Avatar>
            </FixtureState>
            <FixtureState label="Group">
              <AvatarGroup>
                <Avatar><AvatarFallback>AI</AvatarFallback></Avatar>
                <Avatar><AvatarFallback>HN</AvatarFallback></Avatar>
                <Avatar><AvatarFallback>RSS</AvatarFallback></Avatar>
                <AvatarGroupCount>+4</AvatarGroupCount>
              </AvatarGroup>
            </FixtureState>
          </div>
        </FixtureSection>
      </div>
    </FixturePage>
  )
}

export function NavigationAndDataFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Pill, command, and scroll"
      description="Compact selection, command discovery, and constrained scrolling for dense extension surfaces."
    >
      <FixtureSection title="Pill navigation" description="The moving indicator communicates the selected board or view.">
        <PillGroup>
          <button className={pillGroupItemClassName({ active: true })} type="button">
            <PillGroupIndicator layoutId="foundation-pill" />
            <span className="relative">Latest</span>
          </button>
          <button className={pillGroupItemClassName({ active: false })} type="button">Saved</button>
          <button className={pillGroupItemClassName({ active: false })} type="button">Archived</button>
        </PillGroup>
      </FixtureSection>

      <div className="grid gap-6 md:grid-cols-2">
        <FixtureSection title="Command" description="Search and keyboard selection in a bounded result list.">
          <Command className="h-64 ring-1 ring-foreground/10">
            <CommandInput placeholder="Search sources" />
            <CommandList>
              <CommandEmpty>No sources found.</CommandEmpty>
              <CommandGroup heading="Suggested sources">
                <CommandItem value="hacker-news">Hacker News</CommandItem>
                <CommandItem value="github-trending">GitHub Trending</CommandItem>
                <CommandItem value="product-hunt">Product Hunt</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </FixtureSection>

        <FixtureSection title="Scroll area" description="A styled viewport that preserves native scrolling behavior.">
          <ScrollArea className="h-64 rounded-xl border p-4">
            <div className="grid gap-3 pr-4 text-sm">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 last:border-0">
                  <span>
                    Saved article
                    {" "}
                    {index + 1}
                  </span>
                  <Badge variant="outline">Unread</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </FixtureSection>
      </div>
    </FixturePage>
  )
}

export default {
  Colors: ColorsFixture,
  Typography: TypographyFixture,
}
