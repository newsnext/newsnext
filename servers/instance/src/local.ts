import type { SourceDescriptor } from "@newsnext/sources/typings"
import type { PreparedInstanceSourceRequest, SourceLoadResult } from "./source-loader"
import type { LoadInstanceSourceOptions, NewsNextDataInstance } from "./types"
import { sourceDescriptors } from "@newsnext/sources/metadata"
import { loadSource, prepareInstanceSourceRequest } from "./source-loader"

export class NewsNextInstance implements NewsNextDataInstance {
  listSourceDescriptors(): SourceDescriptor[] {
    return [...sourceDescriptors].sort((a, b) => {
      const byCategory = a.category.localeCompare(b.category)
      if (byCategory !== 0) {
        return byCategory
      }

      const byProvider = (a.provider ?? "").localeCompare(b.provider ?? "")
      if (byProvider !== 0) {
        return byProvider
      }

      return a.key.localeCompare(b.key)
    })
  }

  prepareInstanceSourceRequest<T = unknown>(options: LoadInstanceSourceOptions): PreparedInstanceSourceRequest<T> {
    return prepareInstanceSourceRequest<T>(options)
  }

  async loadSource<T = unknown>(options: LoadInstanceSourceOptions): Promise<SourceLoadResult<T>> {
    return loadSource<T>(options)
  }
}

export function createNewsNextInstance(): NewsNextInstance {
  return new NewsNextInstance()
}
