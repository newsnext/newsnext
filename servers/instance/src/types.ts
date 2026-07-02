import type { SourceDescriptor } from "@newsnext/server-source/typings"
import type { LoadSourceOptions, PreparedInstanceSourceRequest, SourceLoadResult } from "./source-loader"

export type LoadInstanceSourceOptions = LoadSourceOptions

export interface NewsNextDataInstance {
  listSourceDescriptors: () => SourceDescriptor[]
  prepareInstanceSourceRequest: <T = unknown>(options: LoadInstanceSourceOptions) => PreparedInstanceSourceRequest<T>
  loadSource: <T = unknown>(options: LoadInstanceSourceOptions) => Promise<SourceLoadResult<T>>
}
