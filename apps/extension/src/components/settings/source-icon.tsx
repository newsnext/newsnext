import type { SourceIconSource } from "@/lib/source"
import { Input } from "@newsnext/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { useAtom } from "jotai"
import { ConfigSection } from "@/components/common/config-section"
import {
  DEFAULT_SOURCE_ICON_SETTINGS,
  resolveSourceIcon,
  SOURCE_ICON_PRESETS,
} from "@/lib/source"
import { sourceIconSettingsAtom } from "@/store/settings"

const SOURCE_OPTIONS = [
  { label: SOURCE_ICON_PRESETS.faviconIm.label, value: "faviconIm" },
  { label: SOURCE_ICON_PRESETS.google.label, value: "google" },
  { label: SOURCE_ICON_PRESETS.vemetric.label, value: "vemetric" },
  { label: SOURCE_ICON_PRESETS.duckDuckGo.label, value: "duckDuckGo" },
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
    <ConfigSection
      title="Card icons"
      description="Choose how icons are generated when a card does not include one."
      surfaceClassName="gap-4 p-4"
    >
      <ConfigSection
        variant="field"
        title="Icon source"
        htmlFor="source-icon-service"
        surface={false}
      >
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
      </ConfigSection>

      <ConfigSection
        variant="field"
        title="URL template"
        htmlFor="source-icon-template"
        surface={false}
        description={(
          <>
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
          </>
        )}
      >
        <div className="flex gap-1 items-center">
          {preview && (
            <img
              src={preview}
              alt=""
              className="size-[2em] rounded-sm"
              referrerPolicy="no-referrer"
            />
          )}
          <Input
            id="source-icon-template"
            value={settings.template}
            placeholder={DEFAULT_SOURCE_ICON_SETTINGS.template}
            spellCheck={false}
            onChange={(event) => {
              setSettings({
                source: "custom",
                template: event.target.value,
              })
            }}
          />
        </div>
      </ConfigSection>
    </ConfigSection>
  )
}
