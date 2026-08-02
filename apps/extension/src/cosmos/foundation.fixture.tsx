import { Badge } from "@newsnext/ui/components/badge"
import { Button } from "@newsnext/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@newsnext/ui/components/card"
import { Input } from "@newsnext/ui/components/input"
import { Switch } from "@newsnext/ui/components/switch"

const fixture = (
  <main className="mx-auto grid min-h-full w-full max-w-3xl content-start gap-8 p-8">
    <header className="space-y-2">
      <Badge variant="outline">UI foundation</Badge>
      <h1 className="text-2xl font-semibold">NewsNext components</h1>
      <p className="text-sm text-muted-foreground">
        Inspect visual states and interactions without opening the full extension.
      </p>
    </header>

    <Card>
      <CardHeader>
        <CardTitle>Buttons</CardTitle>
        <CardDescription>Core variants, sizes, and disabled state.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Form controls</CardTitle>
        <CardDescription>Focus, input, toggle, and disabled behavior.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Input aria-label="Feed name" placeholder="Feed name" />
        <label className="flex items-center justify-between gap-4 text-sm">
          Refresh in the background
          <Switch aria-label="Refresh in the background" defaultChecked />
        </label>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Badge>Active</Badge>
        <Badge variant="secondary">Queued</Badge>
        <Badge variant="destructive">Failed</Badge>
        <Badge variant="outline">Draft</Badge>
      </CardFooter>
    </Card>
  </main>
)

export default fixture
