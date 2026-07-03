import type {
  InferSourceParams,
  NewsItem,
  ProviderDefinition,
  ProviderRegistration,
  RegisteredSourceDefinition,
  SourceLoader,
  SourceParamSchemaMap,
  SourceRegistration,
  SourceSecretDefinition,
  SourceSecretTransformDefinition,
} from "../../typings/sources"

import { $htmlSource } from "./html-source"
import { $jsonSource } from "./json-source"
import { $rssHubSource, $rssSource } from "./rss-source"

function $sourceCallable<P extends SourceParamSchemaMap>(
  registration: Omit<SourceRegistration<P>, "loader">,
  loader: SourceLoader<P>,
): SourceRegistration<P>
function $sourceCallable<P extends SourceParamSchemaMap = Record<string, never>>(
  registration: SourceRegistration<P>,
): SourceRegistration<P>
function $sourceCallable(
  registration:
    | SourceRegistration<any>
    | Omit<SourceRegistration<any>, "loader">,
  loader?: SourceLoader<any>,
): SourceRegistration<any> {
  if (loader !== undefined) {
    return { ...registration, loader }
  }
  return registration as SourceRegistration<any>
}

function mergeDefinitions<T extends SourceSecretDefinition | SourceSecretTransformDefinition>(
  providerDefinitions: T[] | undefined,
  sourceDefinitions: T[] | undefined,
): T[] | undefined {
  if (!providerDefinitions?.length) {
    return sourceDefinitions
  }
  if (!sourceDefinitions?.length) {
    return providerDefinitions
  }
  return [...providerDefinitions, ...sourceDefinitions]
}

export function $provider(
  provider: ProviderRegistration,
): ProviderDefinition {
  const sources = Object.fromEntries(
    provider.sources.map((source) => {
      const registeredSource: RegisteredSourceDefinition = {
        icon: provider.icon,
        providerTitle: source.providerTitle ?? provider.title,
        key: source.key,
        title: source.title,
        params: source.params,
        color: source.color ?? provider.color,
        desc: source.desc ?? provider.desc,
        type: source.type,
        category: source.category ?? provider.category ?? "others",
        home: source.home ?? provider.home,
        secrets: mergeDefinitions(provider.secrets, source.secrets),
        secretTransforms: mergeDefinitions(provider.secretTransforms, source.secretTransforms),
        disable: source.disable,
        loader: source.loader,
      }

      return [source.key, registeredSource]
    }),
  ) as Record<string, RegisteredSourceDefinition>

  return {
    id: provider.id,
    title: provider.title,
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
})
