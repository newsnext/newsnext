import type { ChatProviderSettings } from "@/lib/persisted-settings"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { Input } from "@newsnext/ui/components/input"
import { useAtom } from "jotai"
import { useState } from "react"
import { browser } from "#imports"
import { PhCheckCircle, PhEye, PhEyeSlash } from "@/components/icons/ph"
import { getChatProviderPermissionOrigin } from "@/lib/persisted-settings"
import { chatProviderSettingsAtom } from "@/store/settings"
import { SettingsSection } from "./layout"

interface ProviderFieldProps {
  autoComplete?: string
  label: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "password" | "text" | "url"
  value: string
}

interface ProviderStatus {
  kind: "error" | "success"
  message: string
}

export function ProviderSettings(): React.JSX.Element {
  const [settings, saveSettings] = useAtom(chatProviderSettingsAtom)
  const [draft, setDraft] = useState<ChatProviderSettings>(() => ({ ...settings }))
  const [showApiKey, setShowApiKey] = useState(false)
  const [status, setStatus] = useState<ProviderStatus>()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings)
  const canSave = Boolean(
    draft.name.trim()
    && draft.baseUrl.trim()
    && draft.model.trim()
    && draft.apiKey.trim(),
  )

  function updateDraft(field: keyof ChatProviderSettings, value: string): void {
    setDraft(current => ({ ...current, [field]: value }))
    setStatus(undefined)
  }

  async function handleSave(): Promise<void> {
    if (!canSave) {
      return
    }
    const normalizedDraft = normalizeDraft(draft)

    setSaving(true)
    setStatus(undefined)
    try {
      const access = await requestProviderAccess(normalizedDraft.baseUrl)
      if (!access.ok) {
        setStatus({ kind: "error", message: access.message })
        return
      }
      saveSettings(normalizedDraft)
      setStatus({ kind: "success", message: "Provider settings saved." })
    } catch {
      setStatus({ kind: "error", message: "NewsNext could not request access to this provider." })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest(): Promise<void> {
    if (!canSave) {
      return
    }
    const normalizedDraft = normalizeDraft(draft)
    setTesting(true)
    setStatus(undefined)
    try {
      const access = await requestProviderAccess(normalizedDraft.baseUrl)
      if (!access.ok) {
        setStatus({ kind: "error", message: access.message })
        return
      }
      const { testPiChatProvider } = await import("@/lib/pi-chat-adapter")
      const result = await testPiChatProvider(normalizedDraft)
      setStatus({
        kind: result.ok ? "success" : "error",
        message: result.ok ? result.message : `Connection failed: ${result.message}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error."
      setStatus({ kind: "error", message: `Connection failed: ${message}` })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Chat provider"
        description="Connect an OpenAI-compatible API for the chat sidebar. Credentials stay on this device."
      >
        <Card variant="subtle">
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProviderField
                label="Provider name"
                value={draft.name}
                placeholder="OpenAI"
                onChange={value => updateDraft("name", value)}
              />
              <ProviderField
                label="Model"
                value={draft.model}
                placeholder="gpt-4o-mini"
                onChange={value => updateDraft("model", value)}
              />
            </div>
            <ProviderField
              label="Base URL"
              type="url"
              value={draft.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={value => updateDraft("baseUrl", value)}
            />
            <div className="space-y-2">
              <label htmlFor="chat-provider-api-key" className="block text-sm font-medium">
                API key
              </label>
              <div className="flex gap-2">
                <Input
                  id="chat-provider-api-key"
                  type={showApiKey ? "text" : "password"}
                  autoComplete="off"
                  value={draft.apiKey}
                  placeholder="sk-…"
                  onChange={event => updateDraft("apiKey", event.currentTarget.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  title={showApiKey ? "Hide API key" : "Show API key"}
                  onClick={() => setShowApiKey(value => !value)}
                >
                  {showApiKey ? <PhEyeSlash /> : <PhEye />}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p
                role={status?.kind === "error" ? "alert" : "status"}
                className={status?.kind === "error"
                  ? "min-w-0 flex-1 text-xs leading-5 text-destructive"
                  : "min-w-0 flex-1 text-xs leading-5 text-muted-foreground"}
              >
                {status?.kind === "success" && <PhCheckCircle className="mr-1 inline size-3.5 text-primary" />}
                {status?.message ?? "Testing or saving requests site access for the provider endpoint."}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canSave || saving || testing}
                  onClick={() => void handleTest()}
                >
                  {testing ? "Testing..." : "Test connection"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canSave || !hasChanges || saving || testing}
                  onClick={() => void handleSave()}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  )
}

function normalizeDraft(draft: ChatProviderSettings): ChatProviderSettings {
  return {
    apiKey: draft.apiKey.trim(),
    baseUrl: draft.baseUrl.trim().replace(/\/$/, ""),
    model: draft.model.trim(),
    name: draft.name.trim(),
  }
}

async function requestProviderAccess(baseUrl: string): Promise<{
  message: string
  ok: boolean
}> {
  const origin = getChatProviderPermissionOrigin(baseUrl)
  if (!origin) {
    return { ok: false, message: "Enter a valid HTTP or HTTPS Base URL." }
  }
  const granted = await browser.permissions.request({ origins: [origin] })
  return granted
    ? { ok: true, message: "" }
    : { ok: false, message: "Site access is required to connect to this provider." }
}

function ProviderField({
  autoComplete,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: ProviderFieldProps): React.JSX.Element {
  const id = `chat-provider-${label.toLowerCase().replaceAll(" ", "-")}`
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.currentTarget.value)}
      />
    </div>
  )
}
