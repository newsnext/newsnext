import type { CliPermissionPrompt } from "@/lib/background/cli-permission"
import { Button } from "@newsnext/ui/components/button"
import { Logo } from "@newsnext/ui/components/logo"
import { useEffect, useState } from "react"
import { browser } from "#imports"
import { renderPersistentReactRoot } from "@/lib/react-root"
import "@/styles/index.css"
import "./style.css"

type PromptState
  = | { status: "loading" }
    | { message: string, status: "error" }
    | { prompt: CliPermissionPrompt, status: "ready" }
    | { status: "requesting" }

const REQUEST_UNAVAILABLE_MESSAGE = "This request is no longer available. Rerun the CLI command to try again."

function getRequestId(): string {
  return decodeURIComponent(window.location.hash.slice(1))
}

function getOriginLabel(origin: string): string {
  return origin
    .replace(/^\*:\/\//, "")
    .replace(/\/\*$/, "")
}

function CliPermissionApp(): React.JSX.Element {
  const requestId = getRequestId()
  const [state, setState] = useState<PromptState>(() => requestId
    ? { status: "loading" }
    : { message: REQUEST_UNAVAILABLE_MESSAGE, status: "error" })

  useEffect(() => {
    if (!requestId) return
    void browser.runtime.sendMessage({
      requestId,
      type: "cliPermission.get",
    }).then((prompt: CliPermissionPrompt | undefined) => {
      setState(prompt
        ? { prompt, status: "ready" }
        : { message: REQUEST_UNAVAILABLE_MESSAGE, status: "error" })
    }).catch(() => {
      setState({
        message: "NewsNext could not load this request. Rerun the CLI command to try again.",
        status: "error",
      })
    })
  }, [requestId])

  const handleAllow = (): void => {
    if (state.status !== "ready") return
    const { request } = state.prompt
    setState({ status: "requesting" })
    void browser.permissions.request(request).then(async (granted) => {
      await browser.runtime.sendMessage({
        granted,
        requestId,
        type: "cliPermission.complete",
      })
      window.close()
    }).catch(() => {
      setState({
        message: "NewsNext could not request access. Close this window and rerun the CLI command.",
        status: "error",
      })
    })
  }

  const origins = state.status === "ready" ? state.prompt.request.origins ?? [] : []
  const requiresCookies = state.status === "ready"
    && state.prompt.request.permissions?.includes("cookies")

  return (
    <main className="flex min-h-full items-center">
      <section className="w-full px-7 py-5">
        <header className="flex items-start gap-3">
          <Logo className="size-12 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-6 tracking-tight">Allow site access</h1>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {state.status === "ready"
                ? state.prompt.description
                : "Review the site access requested by the CLI."}
            </p>
          </div>
        </header>

        <div className="mt-5">
          {state.status === "loading" && (
            <p className="text-sm text-muted-foreground" role="status">Loading request…</p>
          )}
          {state.status === "error" && (
            <p className="text-sm leading-6 text-destructive" role="alert">{state.message}</p>
          )}
          {state.status === "requesting" && (
            <p className="text-sm text-muted-foreground" role="status">Waiting for your approval…</p>
          )}
          {state.status === "ready" && (
            <>
              <div className="flex max-h-24 items-start gap-2 overflow-y-auto border-y border-foreground/8 py-3 scrollbar-hidden">
                <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
                  {origins.map(origin => (
                    <li
                      key={origin}
                      className="max-w-full truncate rounded-full bg-secondary px-3 py-1.5 font-mono text-xs text-foreground"
                      title={origin}
                    >
                      {getOriginLabel(origin)}
                    </li>
                  ))}
                </ul>
                {requiresCookies && (
                  <span className="shrink-0 rounded-full bg-theme-500/10 px-2.5 py-1.5 text-xs font-medium text-theme-700 dark:text-theme-300">
                    Cookies
                  </span>
                )}
              </div>
              <footer className="mt-5 flex items-center justify-between gap-5">
                <p className="text-xs leading-5 text-muted-foreground">
                  You can revoke this later in Settings.
                </p>
                <Button className="min-w-36" size="lg" tone="theme" onClick={handleAllow}>
                  Allow access
                </Button>
              </footer>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

renderPersistentReactRoot(document.getElementById("root")!, <CliPermissionApp />)
