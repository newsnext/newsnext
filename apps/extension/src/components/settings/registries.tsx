import type { RegistryValidationResult } from "@/lib/registry-settings"
import { Button } from "@newsnext/ui/components/button"
import { Label } from "@newsnext/ui/components/label"
import { Textarea } from "@newsnext/ui/components/textarea"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { SOURCE_DESCRIPTORS_QUERY_KEY } from "@/hooks/use-source-descriptors"
import { createBackgroundClient } from "@/lib/background-client"
import {
  MAX_REGISTRY_URLS,
  normalizeRegistryUrls,
  readRegistryUrls,
  requestRegistryUrlPermissions,
  writeRegistryUrls,
} from "@/lib/registry-settings"

function parseRegistryUrlLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

export function RegistriesSettings() {
  const queryClient = useQueryClient()
  const [value, setValue] = useState("")
  const [results, setResults] = useState<RegistryValidationResult[]>([])
  const [message, setMessage] = useState<string>()
  const [pendingAction, setPendingAction] = useState<"save" | "update">()

  useEffect(() => {
    void readRegistryUrls().then(urls => setValue(urls.join("\n")))
  }, [])

  const saveInput = async (): Promise<string[] | undefined> => {
    const inputUrls = parseRegistryUrlLines(value)
    const urls = normalizeRegistryUrls(inputUrls)
    if (urls.length !== new Set(inputUrls).size) {
      setMessage(`Enter up to ${MAX_REGISTRY_URLS} unique HTTPS URLs.`)
      return undefined
    }

    const permissionGranted = await requestRegistryUrlPermissions(urls)
    if (!permissionGranted) {
      setMessage("Registry site access was not granted.")
      return undefined
    }

    const savedUrls = await writeRegistryUrls(urls)
    setValue(savedUrls.join("\n"))
    return savedUrls
  }

  const refreshDescriptors = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: SOURCE_DESCRIPTORS_QUERY_KEY })
  }

  const handleSave = async (): Promise<void> => {
    setPendingAction("save")
    setMessage(undefined)
    try {
      const savedUrls = await saveInput()
      if (!savedUrls) {
        return
      }

      const backgroundClient = createBackgroundClient()
      await backgroundClient?.registry.refresh()
      await refreshDescriptors()
      setResults([])
      setMessage("Registry URLs saved. Cached sources are used until the next update.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save registry URLs.")
    } finally {
      setPendingAction(undefined)
    }
  }

  const handleUpdate = async (): Promise<void> => {
    setPendingAction("update")
    setMessage(undefined)
    try {
      const savedUrls = await saveInput()
      if (!savedUrls) {
        return
      }

      const backgroundClient = createBackgroundClient()
      if (!backgroundClient) {
        throw new Error("Registry updates are unavailable in this context.")
      }
      const updateResults = await backgroundClient.registry.update()
      setResults(updateResults)
      await refreshDescriptors()

      const failedCount = updateResults.filter(result => result.error).length
      setMessage(
        failedCount > 0
          ? `Update finished with ${failedCount} ${failedCount === 1 ? "failure" : "failures"}. Cached versions were kept when available.`
          : `Updated ${updateResults.length} ${updateResults.length === 1 ? "registry" : "registries"}.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update registries.")
    } finally {
      setPendingAction(undefined)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="registry-urls">Registry URLs</Label>
        <Textarea
          id="registry-urls"
          value={value}
          onChange={event => setValue(event.target.value)}
          placeholder="https://raw.githubusercontent.com/owner/repo/main/packages/registry/registry.json"
          className="min-h-36 resize-y font-mono text-xs"
          spellCheck={false}
        />
        <p className="text-sm leading-5 text-muted-foreground">
          Enter one HTTPS registry.json URL per line. The bundled registry loads first;
          remote registries are merged from top to bottom, and later entries override
          duplicate source IDs. Saved registries update daily, or when you choose
          Update now.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => void handleSave()} disabled={pendingAction !== undefined}>
          {pendingAction === "save" ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleUpdate()}
          disabled={pendingAction !== undefined}
        >
          {pendingAction === "update" ? "Updating..." : "Update now"}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>

      {results.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {results.map(result => (
            <li key={result.url} className="space-y-1 p-3">
              <div className="break-all text-xs font-medium">{result.url}</div>
              <div className={result.error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {result.error
                  ? `${result.error}${result.retained ? " (cached version retained)" : ""}`
                  : `${result.sourceCount} sources updated`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
