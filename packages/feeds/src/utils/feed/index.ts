import type {
  FeedParamSchemaMap,
  FeedRegistration,
  InferFeedParams,
  NewsItem,
  ProviderDefinition,
  ProviderRegistration,
  RegisteredFeedDefinition,
} from "../../typings/feeds"
import { Time } from "../../typings/constants"

export function $feed<TParams extends FeedParamSchemaMap>(
  feed: FeedRegistration<TParams>,
): FeedRegistration<TParams> {
  return feed
}

export function $provider(
  provider: ProviderRegistration,
): ProviderDefinition {
  const feeds = Object.fromEntries(
    Object.entries(provider.feeds).map(([feedId, feed]) => {
      const registeredFeed: RegisteredFeedDefinition = {
        icon: provider.icon,
        name: feed.name ?? provider.name,
        id: feedId,
        title: feed.title,
        interval: feed.interval ?? Time.Default,
        params: feed.params,
        color: feed.color ?? provider.color,
        desc: feed.desc ?? provider.desc,
        type: feed.type,
        category: feed.category ?? provider.category ?? "others",
        home: feed.home ?? provider.home,
        disable: feed.disable,
        loader: feed.loader,
      }

      return [feedId, registeredFeed]
    }),
  ) as Record<string, RegisteredFeedDefinition>

  return {
    name: provider.name,
    color: provider.color,
    icon: provider.icon,
    desc: provider.desc,
    home: provider.home,
    category: provider.category ?? "others",
    feeds,
  }
}

export function createFeedLoader<Options>(
  handler: (options: Options) => Promise<NewsItem[]>,
) {
  function defineLoader(
    options: () => Options,
  ): { loader: () => Promise<NewsItem[]> }
  function defineLoader<P extends FeedParamSchemaMap>(
    params: P,
    options: (params: InferFeedParams<P>) => Options,
  ): { params: P, loader: (params: InferFeedParams<P>) => Promise<NewsItem[]> }
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

export * from "./html-feed"
export * from "./json-feed"
export * from "./rss-feed"
