import { resolveSources } from "@newsnext/sdk/source/registry"
import github from "@registry/sources/github.json"
import hackernews from "@registry/sources/hackernews.json"
import rss from "@registry/sources/rss.json"

// This explicit import list determines which Providers ship with the extension.
export function resolveBundledSources(): ReturnType<typeof resolveSources> {
  return resolveSources({ github, hackernews, rss })
}
