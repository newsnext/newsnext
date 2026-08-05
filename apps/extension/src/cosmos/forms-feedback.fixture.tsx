/* eslint-disable react-refresh/only-export-components */
import { Alert, AlertDescription, AlertTitle } from "@newsnext/ui/components/alert"
import { Button } from "@newsnext/ui/components/button"
import { Checkbox } from "@newsnext/ui/components/checkbox"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@newsnext/ui/components/empty"
import { Input } from "@newsnext/ui/components/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@newsnext/ui/components/input-group"
import { Label } from "@newsnext/ui/components/label"
import { Progress, ProgressLabel, ProgressValue } from "@newsnext/ui/components/progress"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@newsnext/ui/components/select"
import { Skeleton } from "@newsnext/ui/components/skeleton"
import { Slider } from "@newsnext/ui/components/slider"
import { Switch } from "@newsnext/ui/components/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@newsnext/ui/components/tabs"
import { Textarea } from "@newsnext/ui/components/textarea"
import { useState } from "react"
import { CardEditForm } from "@/components/card/card-back/edit-form"
import { SAMPLE_SOURCE } from "@/cosmos/cards.fixture"
import { FixturePage, FixtureSection, FixtureState } from "@/cosmos/fixture-layout"

function TextInputsFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Text inputs"
      description="Single-line, multiline, grouped, invalid, and disabled input states."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <FixtureSection title="Input" description="Labels remain visible; placeholders demonstrate expected content.">
          <div className="grid gap-5">
            <FixtureState label="Default">
              <div className="grid gap-2">
                <Label htmlFor="source-name">Source name</Label>
                <Input id="source-name" placeholder="Design systems weekly" />
              </div>
            </FixtureState>
            <FixtureState label="Invalid">
              <div className="grid gap-2">
                <Label htmlFor="invalid-url">Feed URL</Label>
                <Input id="invalid-url" aria-invalid defaultValue="not-a-url" />
              </div>
            </FixtureState>
            <FixtureState label="Disabled">
              <Input aria-label="Disabled source" disabled defaultValue="Archived source" />
            </FixtureState>
          </div>
        </FixtureSection>

        <FixtureSection title="Textarea and input group" description="Long-form entry and controls with contextual addons.">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="source-description">Description</Label>
              <Textarea id="source-description" placeholder="Describe this source" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source-url">Feed URL</Label>
              <InputGroup>
                <InputGroupAddon><InputGroupText>https://</InputGroupText></InputGroupAddon>
                <InputGroupInput id="source-url" placeholder="example.com/feed.xml" />
              </InputGroup>
            </div>
          </div>
        </FixtureSection>
      </div>
    </FixturePage>
  )
}

function SelectionControlsFixture(): React.JSX.Element {
  const [interval, setInterval] = useState("30")
  const [density, setDensity] = useState("comfortable")

  return (
    <FixturePage
      category="Basics"
      title="Selection controls"
      description="Binary, ranged, exclusive, and compact navigation choices in one comparison view."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <FixtureSection title="Binary and range" description="Checkbox, switch, and slider controls with direct labels.">
          <div className="grid gap-5">
            <Label className="justify-between gap-4">
              Include read articles
              <Checkbox defaultChecked />
            </Label>
            <Label className="justify-between gap-4">
              Background refresh
              <Switch defaultChecked />
            </Label>
            <div className="grid gap-3">
              <Label htmlFor="article-limit">Maximum articles</Label>
              <Slider id="article-limit" aria-label="Maximum articles" defaultValue={[40]} />
            </div>
          </div>
        </FixtureSection>

        <FixtureSection title="Radio and select" description="Use radios for visible choices and Select when space is constrained.">
          <RadioGroup aria-label="Refresh interval" value={interval} onValueChange={setInterval}>
            {["15", "30", "60"].map(value => (
              <Label key={value}>
                <RadioGroupItem value={value} />
                Every
                {" "}
                {value}
                {" "}
                minutes
              </Label>
            ))}
          </RadioGroup>
          <Select value={density} onValueChange={value => value && setDensity(value)}>
            <SelectTrigger className="w-full" aria-label="Content density"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>
        </FixtureSection>
      </div>

      <FixtureSection title="Tabs" description="Related panels that share the same context and do not require navigation history.">
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="disabled" disabled>Disabled</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="pt-4 text-sm">Common source settings.</TabsContent>
          <TabsContent value="advanced" className="pt-4 text-sm">Caching and request options.</TabsContent>
        </Tabs>
      </FixtureSection>
    </FixturePage>
  )
}

function FeedbackFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Feedback"
      description="Persistent messages, progress, and loading placeholders with representative copy."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <FixtureSection title="Alerts" description="Default and destructive messages pair a concise title with recovery context.">
          <Alert>
            <AlertTitle>Source updated</AlertTitle>
            <AlertDescription>The new configuration will be used on the next refresh.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Refresh failed</AlertTitle>
            <AlertDescription>The source returned an invalid response.</AlertDescription>
          </Alert>
        </FixtureSection>

        <FixtureSection title="Progress and skeleton" description="Determinate progress and content-shaped loading placeholders.">
          <Progress value={68}>
            <ProgressLabel>Importing articles</ProgressLabel>
            <ProgressValue />
          </Progress>
          <div className="grid gap-3 rounded-2xl border border-border/60 p-4">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </FixtureSection>
      </div>
    </FixturePage>
  )
}

function EmptyStateFixture(): React.JSX.Element {
  return (
    <FixturePage
      category="Basics"
      title="Empty state"
      description="A quiet absence state with one clear next action."
      width="md"
    >
      <Empty className="min-h-80 border">
        <EmptyHeader>
          <EmptyTitle>No sources yet</EmptyTitle>
          <EmptyDescription>Add a source to start building your personalized feed.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button>Add source</Button></EmptyContent>
      </Empty>
    </FixturePage>
  )
}

function CardEditingFormFixture(): React.JSX.Element {
  const [source, setSource] = useState(SAMPLE_SOURCE)
  const [savedParams, setSavedParams] = useState<Record<string, unknown>>(SAMPLE_SOURCE.paramsValue ?? {})
  const [draftParams, setDraftParams] = useState(savedParams)
  const hasChanges = JSON.stringify(draftParams) !== JSON.stringify(savedParams)

  return (
    <FixturePage
      category="Basics"
      title="Card editing form"
      description="The real metadata and parameter editor isolated from the source card shell."
      width="md"
    >
      <FixtureSection title="Source fields" description="The provider theme stays scoped to this form specimen.">
        <div className={source.provider.color}>
          <CardEditForm
            source={source}
            draftSourceParams={draftParams}
            hasSourceParams
            hasSourceParamChanges={hasChanges}
            onSourceParamChange={(key, value) => setDraftParams(current => ({ ...current, [key]: value }))}
            onSaveSourceParams={() => setSavedParams(draftParams)}
            onResetSourceParams={() => setDraftParams({ category: "design", compact: false, limit: 20 })}
            onDiscardSourceParams={() => setDraftParams(savedParams)}
            onSaveSourceMeta={metadata => setSource(current => ({
              ...current,
              metadata: { ...current.metadata, ...metadata },
            }))}
          />
        </div>
      </FixtureSection>
    </FixturePage>
  )
}

export default {
  "Text inputs": TextInputsFixture,
  "Selection controls": SelectionControlsFixture,
  "Feedback": FeedbackFixture,
  "Empty state": EmptyStateFixture,
  "Card editing form": CardEditingFormFixture,
}
