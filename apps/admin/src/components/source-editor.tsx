import type { ReactNode } from "react"
import type { SourceDraft, StatusTone } from "@/lib/source-admin"
import { COLORS } from "@newsnext/shared/constants"
import { categories } from "@newsnext/sources/typings"
import { Badge } from "@newsnext/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@newsnext/ui/components/card"
import { Input } from "@newsnext/ui/components/input"
import { Separator } from "@newsnext/ui/components/separator"
import { Switch } from "@newsnext/ui/components/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@newsnext/ui/components/tabs"
import { Textarea } from "@newsnext/ui/components/textarea"
import { cn } from "@newsnext/ui/lib/utils"
import { formatCategory, selectClassName, TYPE_OPTIONS } from "@/lib/source-admin"
import { Field } from "./field"
import { SourceStateBadge } from "./source-state-badge"

export function SourceEditor({
  sourceKey,
  provider,
  updatedAt,
  draft,
  isDirty,
  status,
  onDraftChange,
}: {
  sourceKey: string
  provider: string
  updatedAt: Date | string | number
  draft: SourceDraft
  isDirty: boolean
  status?: { tone: StatusTone, message: string }
  onDraftChange: (key: keyof SourceDraft, value: string | boolean) => void
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b pb-4">
        <CardTitle>{sourceKey}</CardTitle>
        <CardDescription>
          {updatedAt ? `Updated ${new Date(updatedAt).toLocaleString()}` : "Defined in source metadata"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SourceStateBadge enabled={draft.enabled} />
          <Badge variant="outline">{provider}</Badge>
          <Badge variant="outline">{formatCategory(draft.category)}</Badge>
          {isDirty && <Badge variant="secondary">Unsaved changes</Badge>}
        </div>

        <Separator />

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="params">Params</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <EditorField label="Name">
                <Input value={draft.name} onChange={event => onDraftChange("name", event.target.value)} />
              </EditorField>
              <EditorField label="Title">
                <Input value={draft.title} onChange={event => onDraftChange("title", event.target.value)} />
              </EditorField>
              <EditorField label="Home">
                <Input value={draft.home} onChange={event => onDraftChange("home", event.target.value)} />
              </EditorField>
              <EditorField label="Color">
                <select className={selectClassName} value={draft.color} onChange={event => onDraftChange("color", event.target.value)}>
                  {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
                </select>
              </EditorField>
              <EditorField label="Category">
                <select className={selectClassName} value={draft.category} onChange={event => onDraftChange("category", event.target.value)}>
                  {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </EditorField>
              <EditorField label="Type">
                <select className={selectClassName} value={draft.type} onChange={event => onDraftChange("type", event.target.value as SourceDraft["type"])}>
                  {TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </EditorField>
              <EditorField label="Icon">
                <Input value={draft.icon} onChange={event => onDraftChange("icon", event.target.value)} />
              </EditorField>
              <EditorField label="Visibility">
                <div className="flex h-9 items-center justify-between rounded-3xl border border-input bg-input/30 px-3 text-sm">
                  <span>Visible in boards</span>
                  <Switch checked={draft.enabled} onCheckedChange={checked => onDraftChange("enabled", checked)} />
                </div>
              </EditorField>
              <EditorField label="Description" className="md:col-span-2">
                <Textarea value={draft.desc} onChange={event => onDraftChange("desc", event.target.value)} />
              </EditorField>
            </div>
          </TabsContent>

          <TabsContent value="params" className="pt-4">
            <EditorField label="Params JSON">
              <Textarea
                value={draft.paramsText}
                className="min-h-[28rem] font-mono text-xs"
                spellCheck={false}
                onChange={event => onDraftChange("paramsText", event.target.value)}
              />
            </EditorField>
          </TabsContent>
        </Tabs>

        {status && (
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm",
              status.tone === "error" && "bg-destructive/10 text-destructive",
              status.tone === "success" && "bg-primary/10 text-primary",
              status.tone === "muted" && "bg-muted text-muted-foreground",
            )}
          >
            {status.message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EditorField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return <Field label={label} className={className}>{children}</Field>
}
