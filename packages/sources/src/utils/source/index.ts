import type {
  InferSourceParams,
  NewsItem,
  ProviderDefinition,
  ProviderRegistration,
  RegisteredSourceDefinition,
  SourceLoader,
  SourceParamSchemaMap,
  SourceRegistration,
} from "../../typings/sources"
import { Time } from "../../typings/constants"

import { $htmlSource } from "./html-source"
import { $jsonSource } from "./json-source"
import { $rssHubSource, $rssSource } from "./rss-source"

function $sourceCallable<P extends SourceParamSchemaMap = Record<string, never>>(
  registration:
    | SourceRegistration<P>
    | Omit<SourceRegistration<P>, "loader">,
  loaderPart?: Pick<SourceRegistration<P>, "loader">,
): SourceRegistration<P> {
  if (loaderPart !== undefined) {
    return { ...registration, ...loaderPart } as SourceRegistration<P>
  }
  return registration as SourceRegistration<P>
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
  ): { loader: SourceLoader<Record<string, never>> }
  function defineLoader<P extends SourceParamSchemaMap>(
    options: (params: InferSourceParams<P>) => Options,
  ): { loader: SourceLoader<P> }
  function defineLoader(
    options: unknown,
  ): { loader: SourceLoader<any> } {
    const arityZero = (options as (...args: unknown[]) => Options).length === 0
    if (arityZero) {
      const getOpts = options as () => Options
      return {
        loader: async (_params: InferSourceParams<Record<string, never>>) => handler(getOpts()),
      }
    }
    const buildOpts = options as (params: InferSourceParams<any>) => Options
    return {
      loader: async (params: InferSourceParams<any>) => handler(buildOpts(params)),
    }
  }

  return defineLoader
}

export * from "./html-source"
export * from "./json-source"
export * from "./rss-source"

export const $source = Object.assign($sourceCallable, {
  json: $jsonSource,
  html: $htmlSource,
  rss: $rssSource,
  rssHub: $rssHubSource,
}) as typeof $sourceCallable & {
  json: typeof $jsonSource
  html: typeof $htmlSource
  rss: typeof $rssSource
  rssHub: typeof $rssHubSource
}
