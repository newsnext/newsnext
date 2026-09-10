import type { AllActionContract } from "./action/index.js"
import type { ActionDescriptor, ActionInput, ActionName, ActionResult, FetchInput, FetchResult, RunInput, RunResult } from "./actions.js"
import type { ActionOptions, CallOptions, CompareQuery, Comparison, Dataset, DatasetPage, DatasetQuery, ExportQuery, HistoryTime, Observation, ObservationPage, ObservationQuery, ObservationResult, Status, WidgetDataQuery, WidgetDataResult } from "./types.js"
import { createActionsClient } from "./action/client.js"
import { DEFAULT_TIMEOUT_MS, historyTime, NewsNextError, timeRange } from "./protocol.js"

export type SdkTransport = (request: object, options: CallOptions) => AsyncGenerator<unknown>

export class NewsNextClient {
  private readonly options: ActionOptions
  private readonly transport: SdkTransport
  constructor(
    options: ActionOptions,
    transport: SdkTransport,
  ) {
    this.options = { ...options }
    this.transport = transport
  }

  private async* stream<T>(request: object, options?: CallOptions): AsyncGenerator<T> {
    yield* this.transport(request, {
      timeoutMs: options?.timeoutMs ?? this.options.timeoutMs,
      signal: options?.signal ?? this.options.signal,
    }) as AsyncGenerator<T>
  }

  private async call<T>(request: object, options?: CallOptions): Promise<T> {
    let result: T | undefined
    let count = 0
    for await (const value of this.stream<T>(request, options)) {
      result = value
      count++
    }
    if (count !== 1) throw new NewsNextError("SDK_PROTOCOL_ERROR", `Expected one response, received ${count}`)
    return result as T
  }

  status(options?: CallOptions): Promise<Status> {
    return this.call({ method: "status" }, options)
  }

  private executeAction<T>(name: string, input: unknown, options: ActionOptions): Promise<T> {
    return this.call({
      method: "actions.execute",
      name,
      input,
      workerId: options.workerId ?? this.options.workerId,
    }, options)
  }

  private queryHistory<T>(query: object, options?: CallOptions): Promise<T> {
    return this.call({ method: "history.query", query }, options)
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

  readonly widgets = {
    /** Compute Widget data with a daemon-owned one-minute request protection window. */
    data: (query: WidgetDataQuery, options?: CallOptions): Promise<WidgetDataResult> => this.call({
      method: "widgets.data",
      ...query,
    }, options),
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
      return this.stream({ method: "history.export", datasetId: query.datasetId, ...timeRange(query.from, query.to) }, options)
    },
  }

  readonly actions = Object.assign(
    createActionsClient<readonly AllActionContract[], ActionOptions>((name, input, options = {}) => (
      this.executeAction(name, input, options)
    )),
    {
      /** Returns the Worker's runtime action catalog and input schemas. */
      list: (options: ActionOptions = {}): Promise<ActionDescriptor[]> => {
        return this.call({ method: "actions.list", workerId: options.workerId ?? this.options.workerId }, options)
      },
      /** Statically typed public Actions; no catalog request is needed before calling. */
      execute: <Name extends ActionName>(name: Name, input: ActionInput<NoInfer<Name>>, options: ActionOptions = {}): Promise<ActionResult<Name>> => {
        return this.executeAction(name, input, options)
      },
    },
  )
}
