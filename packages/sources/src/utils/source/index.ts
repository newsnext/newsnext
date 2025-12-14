import type { DefineSource, NewsItem, Parameter, SourceOptions } from "../../typings/sources"
import { Time } from "../../typings/constants"
import { typeSafeObjectOmit } from "../../typings/type.util"

export function defineSource(source: DefineSource): Record<string, SourceOptions> {
  const _: Record<string, SourceOptions> = {}
  const _default = {
    ...typeSafeObjectOmit(source, "sub"),
    interval: source.interval ?? Time.Default,
    category: source.category ?? "others",
  } as SourceOptions
  if (source?.sub?.length) {
    source.sub.forEach((subSource) => {
      _[subSource.id] = { ..._default, ...subSource }
    })
  } else if (_default.fetcher!) {
    _.default = _default
  }
  return _
}

export function createSourceFetcher<Options>(
  handler: (options: Options) => Promise<NewsItem[]>,
) {
  function defineFetcher(
    options: () => Options,
  ): { fetcher: () => Promise<NewsItem[]> }
  function defineFetcher<P extends Record<string, Parameter> = Record<string, Parameter>>(
    params: P,
    options: (params: { [K in keyof P]: P[K]["default"] }) => Options,
  ): { params: P, fetcher: (params: any) => Promise<NewsItem[]> }
  function defineFetcher(
    ...args: any[]
  ): any {
    const params = args.length === 2 ? args[0] : {}
    const options = args.length === 2 ? args[1] : args[0]

    return {
      params,
      fetcher: async (paramsValue: any) => {
        const opts = options(paramsValue)
        return handler(opts)
      },
    }
  }
  return defineFetcher
}

export * from "./html-source"
export * from "./json-source"
export * from "./rss-source"
