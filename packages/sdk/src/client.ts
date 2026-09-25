import type { AllActionContract } from "./action/index.js"
import type { ActionDescriptor, ActionInput, ActionName, ActionResult, FetchInput, FetchResult, RunInput, RunResult } from "./actions.js"
import type { ActionOptions, CacheEntry, CacheGetQuery, CachePutQuery, CallOptions, CompareQuery, Comparison, Dataset, DatasetPage, DatasetQuery, ExportQuery, HistoryLatestQuery, HistorySearchPage, HistorySearchQuery, HistoryTime, JsonObject, JsonValue, LiveCardDataQuery, LiveCardDataResult, LiveWidgetDataQuery, LiveWidgetDataResult, LiveWidgetSnapshotResult, Observation, ObservationPage, ObservationQuery, ObservationResult, PluginActionDescriptor, PluginDescriptor, StandaloneActionDescriptor, Status } from "./types.js"
import { SOURCE_REQUEST_TIMEOUT_MS } from "@newsnext/shared/constants"
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

  /** Packages and Actions installed under the local plugins directory. */
  readonly plugins = {
    list: (options?: CallOptions): Promise<PluginDescriptor[]> =>
      this.call({ method: "plugins.list" }, options),
    actions: (options?: CallOptions): Promise<PluginActionDescriptor[]> =>
      this.call({ method: "plugins.actions" }, options),
    execute: <T extends JsonValue = JsonValue>(name: string, input: JsonObject = {}, options?: CallOptions): Promise<T> =>
      this.call({ method: "plugins.execute", name, input }, options),
  }

  /** Actions installed independently under the local actions directory. */
  readonly localActions = {
    list: (options?: CallOptions): Promise<StandaloneActionDescriptor[]> =>
      this.call({ method: "localActions.list" }, options),
    execute: <T extends JsonValue = JsonValue>(name: string, input: JsonObject = {}, options?: CallOptions): Promise<T> =>
      this.call({ method: "localActions.execute", name, input }, options),
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

  private searchHistory(query: HistorySearchQuery, options?: CallOptions): Promise<HistorySearchPage> {
    return this.call({
      method: "history.search",
      ...query,
      ...timeRange(query.from, query.to),
    }, options)
  }

  run(input: RunInput, options: ActionOptions = {}): Promise<RunResult> {
    return this.executeAction("developer.runSource", { ...input, debug: input.debug ?? false }, options)
  }

  fetch(input: FetchInput, options: ActionOptions = {}): Promise<FetchResult> {
    // HTTP defaults mirror the Source runtime (see source-kit request config):
    // 10s per-attempt timeout, shared retry policy, HTTP errors reject.
    // The RPC timeout stays at the SDK default so retries/backoff can complete.
    const timeoutOverride = options.timeoutMs ?? this.options.timeoutMs
    const timeoutMs = timeoutOverride ?? SOURCE_REQUEST_TIMEOUT_MS
    const rpcTimeoutMs = timeoutOverride ?? DEFAULT_TIMEOUT_MS
    return this.executeAction("developer.fetch", {
      ...input,
      method: input.method ?? (input.body === undefined && input.json === undefined ? "GET" : "POST"),
      headers: input.headers ?? [],
      throwHttpErrors: input.throwHttpErrors ?? true,
      credentials: input.credentials ?? "include",
      timeoutMs,
    }, { ...options, timeoutMs: rpcTimeoutMs })
  }

  readonly liveCards = {
    /** Load a saved LiveCard through its owning Worker and the Source snapshot protection. */
    data: (query: LiveCardDataQuery, options: ActionOptions = {}): Promise<LiveCardDataResult> =>
      this.executeAction("liveCard.load", query, options),
  }

  readonly liveWidgets = {
    /** Read the latest matching Widget snapshot without computing new data. */
    readSnapshot: (query: LiveWidgetDataQuery, options?: CallOptions): Promise<LiveWidgetSnapshotResult> => this.call({
      method: "liveWidgets.readSnapshot",
      ...query,
    }, options),
    /** Compute Widget data with a daemon-owned one-minute request protection window. */
    data: (query: LiveWidgetDataQuery, options?: CallOptions): Promise<LiveWidgetDataResult> => this.call({
      method: "liveWidgets.data",
      ...query,
    }, options),
  }

  /** Durable JSON cache stored by the NewsNext daemon, separate from history. */
  readonly cache = {
    getMany: async <T extends JsonValue>(query: CacheGetQuery, options?: CallOptions): Promise<Record<string, CacheEntry<T>>> => {
      const result = await this.call<{ entries: Record<string, CacheEntry<T>> }>({ method: "cache.getMany", ...query }, options)
      return result.entries
    },
    putMany: (query: CachePutQuery, options?: CallOptions): Promise<{ stored: number }> =>
      this.call({ method: "cache.putMany", ...query }, options),
    getOrComputeMany: async <T extends JsonValue>(
      query: CacheGetQuery & { ttlMs?: number },
      compute: (missingKeys: string[]) => Promise<Record<string, T>>,
      options?: CallOptions,
    ): Promise<Record<string, T>> => {
      const keys = [...new Set(query.keys)]
      const cached = await this.cache.getMany<T>({ namespace: query.namespace, keys }, options)
      const missing = keys.filter(key => !Object.hasOwn(cached, key))
      const values = Object.create(null) as Record<string, T>
      for (const key of keys) {
        if (Object.hasOwn(cached, key)) values[key] = cached[key]!.value
      }
      if (missing.length) {
        const computed = await compute(missing)
        for (const key of missing) {
          if (!Object.hasOwn(computed, key) || computed[key] === undefined) throw new Error(`Cache computation omitted key: ${key}`)
          values[key] = computed[key]!
        }
        await this.cache.putMany({
          namespace: query.namespace,
          entries: missing.map(key => ({ key, value: values[key]! })),
          ttlMs: query.ttlMs,
        }, options)
      }
      return values
    },
  }

  readonly history = {
    /** Read the latest retained items, optionally filtering titles and selecting a scope. */
    latest: (query: HistoryLatestQuery = {}, options?: CallOptions): Promise<HistorySearchPage> => {
      return this.searchHistory({ ...query, keyword: query.keyword ?? "", searchIn: "title" }, options)
    },
    /** Search titles or all textual item fields within optional Board and LiveCard scopes. */
    search: (query: HistorySearchQuery, options?: CallOptions): Promise<HistorySearchPage> => {
      return this.searchHistory(query, options)
    },
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
