/* eslint-disable react-refresh/only-export-components */
import { Alert, AlertDescription, AlertTitle } from "@newsnext/ui/components/alert"
import { Button } from "@newsnext/ui/components/button"
import { Checkbox } from "@newsnext/ui/components/checkbox"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@newsnext/ui/components/empty"
import { Input } from "@newsnext/ui/components/input"
import { Progress, ProgressLabel, ProgressValue } from "@newsnext/ui/components/progress"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { Skeleton } from "@newsnext/ui/components/skeleton"
import { Slider } from "@newsnext/ui/components/slider"
import { Switch } from "@newsnext/ui/components/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@newsnext/ui/components/tabs"

function FixturePage({ children }: React.PropsWithChildren) {
  return <main className="mx-auto grid min-h-full w-full max-w-2xl content-start gap-8 p-8">{children}</main>
}

function FormControlsFixture() {
  return (
    <FixturePage>
      <h1 className="text-xl font-semibold">Form controls</h1>
      <Input aria-label="Source name" placeholder="Source name" />
      <Input aria-label="Invalid URL" aria-invalid defaultValue="not-a-url" />
      <label className="flex items-center gap-3 text-sm">
        <Checkbox defaultChecked />
        Include articles already marked as read
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        Background refresh
        <Switch defaultChecked />
      </label>
      <RadioGroup aria-label="Refresh interval" defaultValue="30">
        {["15", "30", "60"].map(value => (
          <label key={value} className="flex items-center gap-3 text-sm">
            <RadioGroupItem value={value} />
            <span>
              Every
              {" "}
              {value}
              {" "}
              minutes
            </span>
          </label>
        ))}
      </RadioGroup>
      <Slider aria-label="Maximum articles" defaultValue={[40]} />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="disabled" disabled>Disabled</TabsTrigger>
        </TabsList>
        <TabsContent value="general">Common source settings.</TabsContent>
        <TabsContent value="advanced">Caching and request options.</TabsContent>
      </Tabs>
    </FixturePage>
  )
}

function FeedbackStatesFixture() {
  return (
    <FixturePage>
      <h1 className="text-xl font-semibold">Feedback states</h1>
      <Alert>
        <AlertTitle>Source updated</AlertTitle>
        <AlertDescription>The new configuration will be used on the next refresh.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Refresh failed</AlertTitle>
        <AlertDescription>The source returned an invalid response.</AlertDescription>
      </Alert>
      <Progress value={68}>
        <ProgressLabel>Importing articles</ProgressLabel>
        <ProgressValue />
      </Progress>
      <div className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </FixturePage>
  )
}

function EmptyStateFixture() {
  return (
    <FixturePage>
      <Empty className="min-h-80 border">
        <EmptyHeader>
          <EmptyTitle>No sources yet</EmptyTitle>
          <EmptyDescription>Add a source to start building your personalized feed.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Add source</Button>
        </EmptyContent>
      </Empty>
    </FixturePage>
  )
}

export default {
  "Form controls": FormControlsFixture,
  "Feedback states": FeedbackStatesFixture,
  "Empty state": EmptyStateFixture,
}
