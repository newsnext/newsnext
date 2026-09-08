import type { ActionDescriptor, FetchInput, FetchResult, RunInput, RunResult } from "./actions.js"
import type { ActionOptions, CallOptions, ClientOptions, CompareQuery, Comparison, Dataset, DatasetPage, DatasetQuery, ExportQuery, HistoryTime, JsonObject, JsonValue, Observation, ObservationPage, ObservationQuery, ObservationResult, Status } from "./types.js"
import { DEFAULT_TIMEOUT_MS, historyTime, NewsNextError, timeRange } from "./protocol.js"
import { call, stream } from "./transport.js"

export type * from "./actions.js"
export { NewsNextError } from "./protocol.js"
export type * from "./types.js"

export class NewsNextClient {
  private readonly options: ClientOptions
  constructor(options: ClientOptions = {}) {
    this.options = { ...options }
  }

  status(options?: CallOptions): Promise<Status> {
    return call(this.options, { method: "status" }, options)
  }

  private executeAction<T>(name: string, input: object, options: ActionOptions): Promise<T> {
    return call(this.options, {
      method: "actions.execute",
      name,
      input,
      workerId: options.workerId ?? this.options.workerId,
    }, options)
  }

  private queryHistory<T>(query: object, options?: CallOptions): Promise<T> {
    return call(this.options, { method: "history.query", query }, options)
  }

  run(input: RunInput, options: ActionOptions = {}): Promise<RunResult> {
    return this.executeAction("developer.runSource", { ...input, debug: input.debug ?? false }, options)
  }

  fetch(input: FetchInput, options: ActionOptions = {}): Promise<FetchResult> {
    return this.executeAction("developer.fetch", {
      ...input,
      method: input.method ?? (input.body === undefined ? "GET" : "POST"),
      headers: input.headers ?? [],
      timeoutMs: options.timeoutMs ?? this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    }, options)
  }

  readonly history = {
    /** One metadata page; use datasets() to collect all pages. */
    datasetPage: (query: DatasetQuery = {}, options?: CallOptions): Promise<DatasetPage> => {
      return this.queryHistory({ ...query, type: "datasets" }, options)
    },
    datasets: async (query: Omit<DatasetQuery, "cursor" | "limit"> = {}, options?: CallOptions): Promise<Dataset[]> => {
      const datasets: Dataset[] = []
      const seen = new Set<string>()
      const cursors = new Set<string>()
      let cursor: string | undefined
      do {
        const page = await this.history.datasetPage({ ...query, cursor, limit: 250 }, options)
        for (const dataset of page.datasets) {
          if (!seen.has(dataset.id)) datasets.push(dataset)
          seen.add(dataset.id)
        }
        if (!page.hasMore) return datasets
        if (!page.nextCursor || cursors.has(page.nextCursor)) throw new NewsNextError("SDK_PROTOCOL_ERROR", "Dataset cursor did not advance")
        cursor = page.nextCursor
        cursors.add(cursor)
      } while (true)
    },
    observations: (query: ObservationQuery, options?: CallOptions): Promise<ObservationPage> => {
      const cursor = query.cursor === undefined ? undefined : historyTime(query.cursor)
      return this.queryHistory({ ...query, ...timeRange(query.from, query.to), cursor, type: "observations" }, options)
    },
    get: (datasetId: string, observedAt: HistoryTime, options?: CallOptions): Promise<ObservationResult> => {
      return this.queryHistory({ type: "get", datasetId, observedAt: historyTime(observedAt) }, options)
    },
    compare: (query: CompareQuery, options?: CallOptions): Promise<Comparison> => {
      const { from: before, to: after } = timeRange(query.before, query.after)
      return this.queryHistory({ type: "compare", datasetId: query.datasetId, before, after }, options)
    },
    /**
     * Full observations in ascending time order, inclusive bounds, one CLI process.
     * Pins the upper timestamp on the first page; not a transactional database snapshot.
     * Throws on incomplete history. Early iterator return terminates the CLI process.
     */
    export: (query: ExportQuery, options?: CallOptions): AsyncGenerator<Observation> => {
      return stream(this.options, { method: "history.export", datasetId: query.datasetId, ...timeRange(query.from, query.to) }, options)
    },
  }

  readonly actions = {
    /** Returns the Worker's runtime action catalog and input schemas. */
    list: (options: ActionOptions = {}): Promise<ActionDescriptor[]> => {
      return call(this.options, { method: "actions.list", workerId: options.workerId ?? this.options.workerId }, options)
    },
    /** Input/output contracts are described by actions.list(); no shell escaping needed. */
    execute: (name: string, input: JsonObject = {}, options: ActionOptions = {}): Promise<JsonValue> => {
      return this.executeAction(name, input, options)
    },
  }
}

export function createClient(options: ClientOptions = {}): NewsNextClient {
  return new NewsNextClient(options)
}
