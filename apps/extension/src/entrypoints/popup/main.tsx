import type { NewsItem, SourceDescriptor } from "@newsnext/sources/typings"
import { sourceDescriptors } from "@newsnext/sources/metadata"
import React from "react"
import ReactDOM from "react-dom/client"
import { createBackgroundClient } from "@/lib/background-client"
import "./style.css"

interface SourceRunState {
  status: "idle" | "loading" | "success" | "error"
  items: NewsItem[]
  error?: string
}

const defaultSourceId = "hackernews:newest"
const initialSourceId = sourceDescriptors.some(source => source.id === defaultSourceId)
  ? defaultSourceId
  : sourceDescriptors[0]?.id ?? ""

function getSourceLabel(source: SourceDescriptor): string {
  return source.title ? `${source.providerTitle} / ${source.title}` : source.providerTitle
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "Failed to load this source"
}

async function loadSourceItems(sourceId: string): Promise<NewsItem[]> {
  const backgroundClient = createBackgroundClient()

  if (!backgroundClient) {
    throw new Error("Background source runner is not available")
  }

  const response = await backgroundClient.loadSource({
    sourceId,
  })

  return response.items
}

function Popup(): React.JSX.Element {
  const [sourceId, setSourceId] = React.useState(initialSourceId)
  const [runState, setRunState] = React.useState<SourceRunState>({
    status: "idle",
    items: [],
  })

  const selectedSource = React.useMemo(
    () => sourceDescriptors.find(source => source.id === sourceId),
    [sourceId],
  )

  const runSelectedSource = React.useCallback(async () => {
    if (!sourceId) {
      return
    }

    setRunState({ status: "loading", items: [] })

    try {
      const items = await loadSourceItems(sourceId)
      setRunState({ status: "success", items })
    } catch (error) {
      setRunState({ status: "error", items: [], error: getErrorMessage(error) })
    }
  }, [sourceId])

  React.useEffect(() => {
    void runSelectedSource()
  }, [runSelectedSource])

  return (
    <main className="popup">
      <header className="popup__header">
        <div className="popup__mark">N</div>
        <div>
          <h1>NewsNext</h1>
          <p>Local source runner</p>
        </div>
      </header>

      <section className="popup__controls" aria-label="Source runner">
        <label className="popup__field">
          <span>Source</span>
          <select value={sourceId} onChange={event => setSourceId(event.target.value)}>
            {sourceDescriptors.map(source => (
              <option key={source.id} value={source.id}>
                {getSourceLabel(source)}
              </option>
            ))}
          </select>
        </label>

        <button
          className="popup__primary"
          type="button"
          onClick={runSelectedSource}
          disabled={runState.status === "loading" || !sourceId}
        >
          {runState.status === "loading" ? "Running..." : "Run in browser"}
        </button>
      </section>

      <section className="popup__result" aria-live="polite">
        <div className="popup__resultHeader">
          <div>
            <h2>{selectedSource ? getSourceLabel(selectedSource) : "No source"}</h2>
            <p>{sourceId}</p>
          </div>
          {runState.status === "success" && <span>{runState.items.length}</span>}
        </div>

        {runState.status === "loading" && <p className="popup__hint">Loading directly from the extension...</p>}
        {runState.status === "error" && <p className="popup__error">{runState.error}</p>}
        {runState.status === "success" && runState.items.length === 0 && (
          <p className="popup__hint">No items returned.</p>
        )}
        {runState.status === "success" && runState.items.length > 0 && (
          <ol className="popup__items">
            {runState.items.slice(0, 12).map(item => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                {item.inline?.text && <p>{item.inline.text}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)
