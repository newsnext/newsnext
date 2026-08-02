import type { SourceIconSource } from "@/lib/source-icon"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { Input } from "@newsnext/ui/components/input"
import { Label } from "@newsnext/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { useAtom } from "jotai"
import {
  resolveSourceIcon,
  SOURCE_ICON_PRESETS,
} from "@/lib/source-icon"
import { sourceIconSettingsAtom } from "@/store/settings"
import { SettingsSection } from "./layout"

const SOURCE_OPTIONS = [
  { label: SOURCE_ICON_PRESETS.folo.label, value: "folo" },
  { label: SOURCE_ICON_PRESETS.google.label, value: "google" },
  { label: "Custom", value: "custom" },
] as const satisfies ReadonlyArray<{ label: string, value: SourceIconSource }>

export function SourceIconSettings(): React.JSX.Element {
  const [settings, setSettings] = useAtom(sourceIconSettingsAtom)
  const sourceLabel = SOURCE_OPTIONS.find(option => option.value === settings.source)?.label
    ?? "Custom"
  const preview = resolveSourceIcon(
    undefined,
    "https://google.com/search",
    settings.template,
  )

  const handleSourceChange = (source: SourceIconSource | null): void => {
    if (!source) {
      return
    }

    const preset = source === "custom" ? undefined : SOURCE_ICON_PRESETS[source]
    setSettings({
      source,
      template: preset?.template ?? settings.template,
    })
  }

  return (
    <SettingsSection
      title="Source icons"
      description="Choose how icons are generated when a provider does not include one."
    >
      <Card variant="subtle">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-icon-service">Icon source</Label>
            <Select value={settings.source} onValueChange={handleSourceChange}>
              <SelectTrigger id="source-icon-service" className="w-56">
                <span className="flex-1 truncate text-left">{sourceLabel}</span>
              </SelectTrigger>
              <SelectContent align="start">
                {SOURCE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-icon-template">URL template</Label>
            <Input
              id="source-icon-template"
              value={settings.template}
              placeholder="https://www.google.com/s2/favicons?domain={hostname}&sz=128"
              spellCheck={false}
              onChange={(event) => {
                setSettings({
                  source: "custom",
                  template: event.target.value,
                })
              }}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Supports
              {" "}
              <code>{"{hostname}"}</code>
              ,
              {" "}
              <code>{"{origin}"}</code>
              , and
              {" "}
              <code>{"{url}"}</code>
              . Leave empty to disable generated icons.
            </p>
            {preview && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <img
                  src={preview}
                  alt=""
                  className="size-5 rounded-sm"
                  referrerPolicy="no-referrer"
                />
                <span className="truncate">{preview}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  )
}
