import type {
  InferSourceParams,
  NewsItem,
  ProviderDefinition,
  ProviderRegistration,
  RegisteredSourceDefinition,
  SourceParamSchemaMap,
  SourceRegistration,
} from "../../typings/sources"
import { Time } from "../../typings/constants"

export function $source<TParams extends SourceParamSchemaMap>(
  source: SourceRegistration<TParams>,
): SourceRegistration<TParams> {
  return source
}

export function $provider(
  provider: ProviderRegistration,
): ProviderDefinition {
  const sources = Object.fromEntries(
    Object.entries(provider.sources).map(([sourceId, source]) => {
      const registeredSource: RegisteredSourceDefinition = {
        icon: provider.icon,
        name: source.name ?? provider.name,
        id: sourceId,
        title: source.title,
        interval: source.interval ?? Time.Default,
        params: source.params,
        color: source.color ?? provider.color,
        desc: source.desc ?? provider.desc,
        type: source.type,
        category: source.category ?? provider.category ?? "others",
        home: source.home ?? provider.home,
        disable: source.disable,
        loader: source.loader,
      }

      return [sourceId, registeredSource]
    }),
  ) as Record<string, RegisteredSourceDefinition>

  return {
    name: provider.name,
    color: provider.color,
    icon: provider.icon,
    desc: provider.desc,
    home: provider.home,
    category: provider.category ?? "others",
    sources,
  }
}

export function createLoader<Options>(
  handler: (options: Options) => Promise<NewsItem[]>,
) {
  function defineLoader(
    options: () => Options,
  ): { loader: () => Promise<NewsItem[]> }
  function defineLoader<P extends SourceParamSchemaMap>(
    params: P,
    options: (params: InferSourceParams<P>) => Options,
  ): { params: P, loader: (params: InferSourceParams<P>) => Promise<NewsItem[]> }
  function defineLoader(
    ...args: any[]
  ): any {
    const params = args.length === 2 ? args[0] : {}
    const options = args.length === 2 ? args[1] : args[0]

    return {
      params,
      loader: async (paramsValue: any) => {
        const opts = options(paramsValue)
        return handler(opts)
      },
    }
  }

  return defineLoader
}

export * from "./html-source"
export * from "./json-source"
export * from "./rss-source"
